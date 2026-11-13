using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Dados.Fluxos;

namespace One.Api.Chamados;

internal static class ConsultasDoDetalhe
{
    internal sealed record Cabecalho(string? NumeroMatricula, string Curso, string Setor, string Categoria, string Solicitante, string? Responsavel,
        List<DetalheChamado.Destino> Setores, List<DetalheChamado.Destino> Categorias);

    internal sealed record LinhaDaMensagem(long Id, string Tipo, string Texto, long? AutorId, string? Autor, DateTime CriadaEm, List<DetalheChamado.DoAnexo> Anexos);

    internal sealed record LinhaDoEvento(string Tipo, long? AtorId, string? Ator, string? De, string? Para, string? Detalhe, DateTime CriadoEm);

    internal sealed record LinhaDaTranscricao(long Id, string Autor, string Texto, DateTime CriadaEm, List<CitacaoArtigo> Citacoes, List<DetalheChamado.DoAnexo> Anexos);

    internal sealed record LinhaDoFluxo(int Versao, int? Semestre, string? Curso, string Destino, int Total);

    internal static Task<Cabecalho> LerCabecalho(OneDb db, Chamado c, bool semNumero, bool comDestinos) =>
        db.Matriculas.Where(m => m.Id == c.MatriculaId).Select(m => new Cabecalho(
            semNumero ? null : m.Numero,
            m.Curso!.Nome,
            db.Setores.Where(s => s.Id == c.SetorId).Select(s => s.Nome).First(),
            db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).First(),
            db.Usuarios.Where(u => u.Id == c.SolicitanteId).Select(u => u.Nome).First(),
            db.Usuarios.Where(u => u.Id == c.ResponsavelId).Select(u => u.Nome).FirstOrDefault(),
            db.Setores.Where(s => comDestinos && s.Ativo && s.CursoId == null && s.Id != c.SetorId).OrderBy(s => s.Nome).Select(s => new DetalheChamado.Destino(s.Id, s.Nome)).ToList(),
            db.Categorias.Where(x => comDestinos && x.Ativa).OrderBy(x => x.Nome).Select(x => new DetalheChamado.Destino(x.Id, x.Nome)).ToList())).SingleAsync();

    internal static Task<List<LinhaDaMensagem>> LerMensagens(OneDb db, Chamado c, bool equipe) =>
        db.MensagensChamado.Where(m => m.ChamadoId == c.Id && (equipe || m.Tipo == TiposMensagem.Publica)).OrderBy(m => m.Id)
            .Select(m => new LinhaDaMensagem(m.Id, m.Tipo, m.Texto, m.AutorId,
                db.Usuarios.Where(u => u.Id == m.AutorId).Select(u => u.Nome).FirstOrDefault(), m.CriadaEm,
                db.Anexos.Where(x => x.MensagemChamadoId == m.Id).OrderBy(x => x.Id).Select(x => new DetalheChamado.DoAnexo(x.Id, x.Nome, x.Tipo, x.Tamanho)).ToList()))
            .ToListAsync();

    internal static Task<List<LinhaDoEvento>> LerEventos(OneDb db, Chamado c) =>
        db.EventosChamado.Where(e => e.ChamadoId == c.Id).OrderBy(e => e.CriadoEm).ThenBy(e => e.Id)
            .Select(e => new LinhaDoEvento(e.Tipo, e.AtorId, db.Usuarios.Where(u => u.Id == e.AtorId).Select(u => u.Nome).FirstOrDefault(), e.De, e.Para, e.Detalhe, e.CriadoEm))
            .ToListAsync();

    internal static Task<List<LinhaDaTranscricao>> LerTranscricao(OneDb db, Chamado c) =>
        db.MensagensConversa.Where(m => m.ConversaId == c.ConversaId).OrderBy(m => m.Id)
            .Select(m => new LinhaDaTranscricao(m.Id, m.Autor, m.Texto, m.CriadaEm, m.Citacoes,
                db.AnexosConversa.Where(x => x.MensagemConversaId == m.Id).OrderBy(x => x.Id).Select(x => new DetalheChamado.DoAnexo(x.Id, x.Nome, x.Tipo, x.Tamanho)).ToList()))
            .ToListAsync();

    internal static Task<LinhaDoFluxo> LerFluxo(OneDb db, long versaoId, int ordem) =>
        db.VersoesFluxo.Where(v => v.Id == versaoId)
            .Join(db.Fluxos, v => v.FluxoId, f => f.Id, (v, f) => new LinhaDoFluxo(v.Numero, f.Semestre,
                db.Cursos.Where(x => x.Id == f.CursoId).Select(x => x.Nome).FirstOrDefault(),
                db.EtapasFluxo.Where(e => e.VersaoFluxoId == versaoId && e.Ordem == ordem).Select(e => e.Destino).First(),
                db.EtapasFluxo.Count(e => e.VersaoFluxoId == versaoId))).SingleAsync();
}


