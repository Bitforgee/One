using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Dados.Fluxos;

namespace One.Api.Chamados.Shared;

public sealed record DetalheChamado(
    string Numero, string Titulo, string Estado, string? MotivoFechamento, string? NumeroOriginal, long SetorId, string Setor, string Categoria,
    string? Responsavel, DateTime CriadoEm, DateTime? ResolvidoEm, DetalheChamado.DaMatricula Matricula, string? Solicitante, string? Resumo,
    string? OrigemCategoria, IReadOnlyList<object> Transcricao, IReadOnlyList<DetalheChamado.DaMensagem> Mensagens,
    IReadOnlyList<DetalheChamado.DoEvento>? Eventos, IEnumerable<string> Acoes, IReadOnlyList<DetalheChamado.Destino>? Setores,
    IReadOnlyList<DetalheChamado.Destino>? Categorias, DetalheChamado.DoFluxo? Fluxo)
{
    public sealed record DoFluxo(int Versao, int Etapa, int Total, string Destino, string Abrangencia);

    public sealed record DaMatricula(string? Numero, string Curso, int Semestre);

    public sealed record TranscricaoDaEquipe(string Autor, string Texto, DateTime CriadaEm, IEnumerable<Fontes.FonteCitada>? Fontes, [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<DoAnexo>? Anexos);

    public sealed record TranscricaoDoAluno(string Autor, string Texto, DateTime CriadaEm);

    public sealed record DaMensagem(long Id, string Tipo, string Texto, string Autor, bool DoAluno, DateTime CriadaEm, IReadOnlyList<DoAnexo> Anexos);

    public sealed record DoAnexo(long Id, string Nome, string Tipo, long Tamanho);

    public sealed record DoEvento(string Tipo, string Ator, bool DoAluno, string? De, string? Para, string? Detalhe, DateTime CriadoEm);

    public sealed record Destino(long Id, string Nome);

    record DaEquipe(string? Solicitante, string? Resumo, string? OrigemCategoria, Dictionary<long, IEnumerable<Fontes.FonteCitada>> Fontes,
        IReadOnlyList<DoEvento>? Eventos, IReadOnlyList<Destino>? Setores, IReadOnlyList<Destino>? Categorias)
    {
        public static readonly DaEquipe Nada = new(null, null, null, [], null, null, null);
    }

    record LinhaDoFluxo(int Versao, long? CursoId, int? Semestre);

    record LinhaDaTranscricao(long Id, string Autor, string Texto, DateTime CriadaEm, List<CitacaoArtigo> Citacoes, IReadOnlyList<DoAnexo>? Anexos = null);

    record AnexoLido(long Id, long MensagemChamadoId, string Nome, string Tipo, long Tamanho);

    public static async Task<DetalheChamado> Montar(OneDb db, long usuarioId, Chamado c, string papel)
    {
        var equipe = papel == PermissoesChamado.Atendente;
        var lider = papel == PermissoesChamado.Lider;
        var vemDaEquipe = equipe || lider;
        var matricula = await DaMatriculaDoChamado(db, c, lider);
        var nomes = await db.Usuarios.Where(x => x.Id == c.SolicitanteId || x.Id == c.ResponsavelId
                || db.MensagensChamado.Any(m => m.ChamadoId == c.Id && m.AutorId == x.Id) || db.EventosChamado.Any(e => e.ChamadoId == c.Id && e.AtorId == x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Nome);
        var transcricao = lider ? new List<LinhaDaTranscricao>() : await CarregarTranscricao(db, c, equipe);
        var daEquipe = vemDaEquipe ? await Equipe(db, c, nomes, transcricao, equipe) : DaEquipe.Nada;

        return new DetalheChamado(
            c.Numero, c.Titulo, c.Estado, c.MotivoFechamento, c.NumeroOriginal, c.SetorId,
            await db.Setores.Where(s => s.Id == c.SetorId).Select(s => s.Nome).SingleAsync(),
            await db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).SingleAsync(),
            c.ResponsavelId is { } r ? nomes[r] : null, c.CriadoEm, c.ResolvidoEm, matricula,
            daEquipe.Solicitante, daEquipe.Resumo, daEquipe.OrigemCategoria, LinhasDaTranscricao(transcricao, equipe, daEquipe),
            await DasMensagens(db, c, vemDaEquipe, nomes), daEquipe.Eventos, await AcoesDoChamado(db, c, papel, usuarioId),
            daEquipe.Setores, daEquipe.Categorias, await DoFluxoDoChamado(db, c, vemDaEquipe));
    }

    static IReadOnlyList<object> LinhasDaTranscricao(List<LinhaDaTranscricao> transcricao, bool equipe, DaEquipe daEquipe) =>
        [.. transcricao.Select(m => equipe
            ? (object)new TranscricaoDaEquipe(m.Autor, m.Texto, m.CriadaEm, daEquipe.Fontes.GetValueOrDefault(m.Id), m.Anexos)
            : new TranscricaoDoAluno(m.Autor, m.Texto, m.CriadaEm))];

    static Task<DaMatricula> DaMatriculaDoChamado(OneDb db, Chamado c, bool semNumero) =>
        db.Matriculas.Where(m => m.Id == c.MatriculaId).Select(m => new DaMatricula(semNumero ? null : m.Numero, m.Curso!.Nome, c.Semestre)).SingleAsync();

    static async Task<List<LinhaDaTranscricao>> CarregarTranscricao(OneDb db, Chamado c, bool equipe)
    {
        var transcricao = await db.MensagensConversa.Where(m => m.ConversaId == c.ConversaId).OrderBy(m => m.Id)
            .Select(m => new LinhaDaTranscricao(m.Id, m.Autor, m.Texto, m.CriadaEm, m.Citacoes)).ToListAsync();
        return equipe ? await ComAnexos(db, c, transcricao) : transcricao;
    }

    static async Task<List<string>> AcoesDoChamado(OneDb db, Chamado c, string papel, long usuarioId)
    {
        var acoes = PermissoesChamado.Acoes(c.Estado, papel, c.ResponsavelId, usuarioId).ToList();
        if (!await ResolverFluxo.TemEtapaSeguinte(db, c)) acoes.Remove("subir");
        return acoes;
    }

    static async Task<DoFluxo?> DoFluxoDoChamado(OneDb db, Chamado c, bool equipe)
    {
        if (!equipe || c.VersaoFluxoId is not { } versaoId || c.EtapaOrdem is not { } ordem) return null;
        var versao = await db.VersoesFluxo.Where(v => v.Id == versaoId)
            .Join(db.Fluxos, v => v.FluxoId, f => f.Id, (v, f) => new LinhaDoFluxo(v.Numero, f.CursoId, f.Semestre)).SingleAsync();
        var curso = versao.CursoId is { } cursoId ? await db.Cursos.Where(x => x.Id == cursoId).Select(x => x.Nome).SingleAsync() : null;
        var destino = await db.EtapasFluxo.Where(e => e.VersaoFluxoId == versaoId && e.Ordem == ordem).Select(e => e.Destino).SingleAsync();
        return new DoFluxo(versao.Versao, ordem, await db.EtapasFluxo.CountAsync(e => e.VersaoFluxoId == versaoId), destino, Abrangencia(curso, versao.Semestre));
    }

    public static string Abrangencia(string? curso, int? semestre) =>
        curso is null ? "Todos os cursos" : semestre is null ? curso : $"{curso}, {semestre}º semestre";

    static async Task<List<LinhaDaTranscricao>> ComAnexos(OneDb db, Chamado c, List<LinhaDaTranscricao> transcricao)
    {
        var anexos = (await db.AnexosConversa.Where(x => db.MensagensConversa.Any(m => m.Id == x.MensagemConversaId && m.ConversaId == c.ConversaId)).OrderBy(x => x.Id).ToListAsync())
            .ToLookup(x => x.MensagemConversaId);
        return [.. transcricao.Select(m => m.Autor != ConversaRotas.Aluno ? m : m with { Anexos = [.. anexos[m.Id].Select(x => new DoAnexo(x.Id, x.Nome, x.Tipo, x.Tamanho))] })];
    }

    static async Task<IReadOnlyList<DaMensagem>> DasMensagens(OneDb db, Chamado c, bool equipe, Dictionary<long, string> nomes)
    {
        var mensagens = await db.MensagensChamado.Where(m => m.ChamadoId == c.Id && (equipe || m.Tipo == TiposMensagem.Publica)).OrderBy(m => m.Id).ToListAsync();
        var ids = mensagens.Select(m => m.Id).ToList();
        var anexos = (await db.Anexos.Where(x => ids.Contains(x.MensagemChamadoId)).OrderBy(x => x.Id)
            .Select(x => new AnexoLido(x.Id, x.MensagemChamadoId, x.Nome, x.Tipo, x.Tamanho)).ToListAsync()).ToLookup(x => x.MensagemChamadoId);
        return [.. mensagens.Select(m => new DaMensagem(m.Id, m.Tipo, m.Texto, m.AutorId is { } a ? nomes[a] : "Sistema", m.AutorId == c.SolicitanteId, m.CriadaEm,
            [.. anexos[m.Id].Select(x => new DoAnexo(x.Id, x.Nome, x.Tipo, x.Tamanho))]))];
    }

    static async Task<DaEquipe> Equipe(OneDb db, Chamado c, Dictionary<long, string> nomes, List<LinhaDaTranscricao> transcricao, bool completa)
    {
        var eventos = (await db.EventosChamado.Where(e => e.ChamadoId == c.Id).OrderBy(e => e.CriadoEm).ThenBy(e => e.Id).ToListAsync())
            .Select(e => new DoEvento(e.Tipo, e.AtorId is { } a ? nomes[a] : "Sistema", e.AtorId == c.SolicitanteId, e.De, e.Para, e.Detalhe, e.CriadoEm)).ToList();
        if (!completa) return new DaEquipe(nomes[c.SolicitanteId], c.Resumo, null, [], eventos, null, null);
        var fonte = await Fontes.Citadas(db, transcricao.SelectMany(m => m.Citacoes).ToList());
        var fontes = transcricao.Where(m => m.Citacoes.Count > 0).ToDictionary(m => m.Id, m => m.Citacoes.Select(fonte));
        var setores = await db.Setores.Where(s => s.Ativo && s.CursoId == null && s.Id != c.SetorId).OrderBy(s => s.Nome).Select(s => new Destino(s.Id, s.Nome)).ToListAsync();
        var categorias = await db.Categorias.Where(x => x.Ativa).OrderBy(x => x.Nome).Select(x => new Destino(x.Id, x.Nome)).ToListAsync();
        return new DaEquipe(nomes[c.SolicitanteId], c.Resumo, c.OrigemCategoria, fontes, eventos, setores, categorias);
    }
}
