using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Dados.Fluxos;
using static One.Api.Dados.Fluxos.RoteamentoDeFluxo;

namespace One.Api.Chamados;

public static class ConsultasDeFluxo
{
    public static async Task<long?> Lideranca(OneDb db, long cursoId, int semestre, long alunoId) =>
        await db.Setores
            .Where(s => s.CursoId == cursoId && s.Semestre == semestre && s.Ativo
                && db.AtendenteSetores.Any(a => a.SetorId == s.Id && a.UsuarioId != alunoId && db.Usuarios.Any(u => u.Id == a.UsuarioId && u.Ativo)))
            .Select(s => (long?)s.Id).FirstOrDefaultAsync();

    public static async Task<Contexto> CarregarContexto(OneDb db, long cursoId, int? semestre = null, long alunoId = 0)
    {
        var setores = await db.Setores.ToDictionaryAsync(s => s.Id);
        var coordenacao = await db.Cursos.Where(c => c.Id == cursoId).Select(c => c.SetorCoordenacaoId).SingleOrDefaultAsync();
        return new Contexto(setores, coordenacao, semestre is { } s ? await Lideranca(db, cursoId, s, alunoId) : null);
    }

    public static async Task<List<string>> CategoriasQueUsamOSetor(OneDb db, long setorId)
    {
        var fluxos = await db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas).ToListAsync();
        var categorias = fluxos.Where(f => UsaOSetor(f, setorId)).Select(f => f.CategoriaId).ToHashSet();
        return [.. (await db.Categorias.Where(c => categorias.Contains(c.Id)).Select(c => c.Nome).ToListAsync()).Distinct().Order()];
    }

    public static Task<List<Fluxo>> Candidatos(OneDb db, long categoriaId, long cursoId) =>
        db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas)
            .Where(f => f.CategoriaId == categoriaId && (f.CursoId == null || f.CursoId == cursoId)).ToListAsync();

    public static async Task<Rota> Rotear(OneDb db, Categoria categoria, Matricula matricula, bool comLideranca)
    {
        var contexto = await CarregarContexto(db, matricula.CursoId, matricula.Semestre, matricula.UsuarioId);
        var triagem = contexto.Setores.Values.Single(s => s.Triagem).Id;
        if (categoria.Padrao) return new Rota(null, null, triagem);
        var fluxo = Escolher(await Candidatos(db, categoria.Id, matricula.CursoId), matricula.CursoId, matricula.Semestre);
        var passo = fluxo is null ? null : Proximo(fluxo.Vigente!.Etapas, 0, contexto, comLideranca);
        return new Rota(passo is null ? null : fluxo, passo, passo?.SetorId ?? triagem);
    }

    public static async Task<Passo?> Seguinte(OneDb db, Chamado chamado)
    {
        if (chamado.VersaoFluxoId is not { } versao || chamado.EtapaOrdem is not { } ordem) return null;
        var etapas = await db.EtapasFluxo.Where(e => e.VersaoFluxoId == versao && e.Ordem > ordem).ToListAsync();
        if (etapas.Count == 0) return null;
        var cursoId = await db.Matriculas.Where(m => m.Id == chamado.MatriculaId).Select(m => m.CursoId).SingleAsync();
        return Proximo(etapas, ordem, await CarregarContexto(db, cursoId), false);
    }

    public static Task<bool> TemEtapaSeguinte(OneDb db, Chamado chamado) =>
        chamado.VersaoFluxoId is { } versao && chamado.EtapaOrdem is { } ordem
            ? db.EtapasFluxo.AnyAsync(e => e.VersaoFluxoId == versao && e.Ordem > ordem)
            : Task.FromResult(false);
}
