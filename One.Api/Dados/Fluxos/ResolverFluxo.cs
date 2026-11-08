using Microsoft.EntityFrameworkCore;

namespace One.Api.Dados.Fluxos;

// A única decisão de "para qual setor vai o chamado": a transferência, a subida (rota e Agendador) e o simulador chamam estas funções.
public static class ResolverFluxo
{
    public const string SemCoordenacao = "Curso sem coordenação";
    public const string SemLideranca = "Sem liderança disponível";
    public const string SetorInativo = "Setor inativo";
    public const string SemAceite = "O aluno não aceitou a liderança";

    public sealed record Contexto(IReadOnlyDictionary<long, Setor> Setores, long? CoordenacaoDoCurso, long? Lideranca);

    public sealed record Resolucao(long? SetorId, string? Motivo)
    {
        public bool Resolvida => SetorId is not null;
    }

    public sealed record Passo(EtapaFluxo Etapa, long SetorId);

    public sealed record Rota(Fluxo? Fluxo, Passo? Passo, long SetorId);

    // O fluxo publicado mais específico: curso e semestre, depois só o curso, depois todos os cursos.
    public static Fluxo? Escolher(IEnumerable<Fluxo> fluxos, long cursoId, int semestre)
    {
        var publicados = fluxos.Where(f => f.Vigente is not null).ToList();
        return publicados.FirstOrDefault(f => f.CursoId == cursoId && f.Semestre == semestre)
            ?? publicados.FirstOrDefault(f => f.CursoId == cursoId && f.Semestre is null)
            ?? publicados.FirstOrDefault(f => f.CursoId is null);
    }

    public static Resolucao Etapa(EtapaFluxo etapa, Contexto contexto) => etapa.Destino switch
    {
        DestinosEtapa.Setor => contexto.Setores.TryGetValue(etapa.SetorId ?? 0, out var s) && s.Ativo ? new Resolucao(s.Id, null) : new Resolucao(null, SetorInativo),
        DestinosEtapa.CoordenacaoCurso => contexto.CoordenacaoDoCurso is { } id ? new Resolucao(id, null) : new Resolucao(null, SemCoordenacao),
        _ => contexto.Lideranca is { } lider ? new Resolucao(lider, null) : new Resolucao(null, SemLideranca),
    };

    // A etapa de liderança só vale com o aceite do aluno; sem liderança disponível o motivo é a falta dela.
    public static Resolucao Situacao(EtapaFluxo etapa, Contexto contexto, bool aceitaLideranca)
    {
        var resolucao = Etapa(etapa, contexto);
        return DestinosEtapa.ExigeAceite(etapa.Destino) && resolucao.Resolvida && !aceitaLideranca ? new Resolucao(null, SemAceite) : resolucao;
    }

    // A primeira etapa depois de `depoisDe` que resolve.
    public static Passo? Proximo(IEnumerable<EtapaFluxo> etapas, int depoisDe, Contexto contexto, bool aceitaLideranca) =>
        etapas.Where(e => e.Ordem > depoisDe).OrderBy(e => e.Ordem)
            .Select(e => (Etapa: e, Resolucao: Situacao(e, contexto, aceitaLideranca)))
            .Where(x => x.Resolucao.Resolvida)
            .Select(x => new Passo(x.Etapa, x.Resolucao.SetorId!.Value))
            .FirstOrDefault();

    // A liderança do curso e semestre só está disponível com o setor ativo e ao menos um atendente ativo que não seja o aluno (AC 55).
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

    public static Task<List<Fluxo>> Candidatos(OneDb db, long categoriaId, long cursoId) =>
        db.Fluxos.Include(f => f.Versoes).ThenInclude(v => v.Etapas)
            .Where(f => f.CategoriaId == categoriaId && (f.CursoId == null || f.CursoId == cursoId)).ToListAsync();

    public static async Task<Rota> Rotear(OneDb db, Categoria categoria, Matricula matricula, bool aceitaLideranca)
    {
        var contexto = await CarregarContexto(db, matricula.CursoId, matricula.Semestre, matricula.UsuarioId);
        var triagem = contexto.Setores.Values.Single(s => s.Triagem).Id;
        if (categoria.Padrao) return new Rota(null, null, triagem);
        var fluxo = Escolher(await Candidatos(db, categoria.Id, matricula.CursoId), matricula.CursoId, matricula.Semestre);
        var passo = fluxo is null ? null : Proximo(fluxo.Vigente!.Etapas, 0, contexto, aceitaLideranca);
        return new Rota(passo is null ? null : fluxo, passo, passo?.SetorId ?? triagem);
    }

    // A etapa seguinte do chamado que resolve, ou nenhuma (fora de fluxo, última etapa ou nenhuma seguinte resolve).
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
