using System.Text.Json.Serialization;
using One.Api.Conhecimento;
using One.Api.Dados;
using static One.Api.Chamados.ConsultasDoDetalhe;

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

    record DaEquipe(IReadOnlyList<DoEvento>? Eventos, Dictionary<long, IEnumerable<Fontes.FonteCitada>> Fontes, IReadOnlyList<Destino>? Setores, IReadOnlyList<Destino>? Categorias)
    {
        public static readonly DaEquipe Nada = new(null, [], null, null);
    }

    public static async Task<DetalheChamado> Montar(OneDb db, long usuarioId, Chamado c, string papel)
    {
        var equipe = papel == PermissoesChamado.Atendente;
        var lider = papel == PermissoesChamado.Lider;
        var vemDaEquipe = equipe || lider;
        var cabecalho = await LerCabecalho(db, c, lider, equipe);
        var transcricao = lider ? [] : await LerTranscricao(db, c);
        var daEquipe = vemDaEquipe ? await Equipe(db, c, cabecalho, transcricao, equipe) : DaEquipe.Nada;
        var mensagens = await LerMensagens(db, c, vemDaEquipe);

        return new DetalheChamado(
            c.Numero, c.Titulo, c.Estado, c.MotivoFechamento, c.NumeroOriginal, c.SetorId, cabecalho.Setor, cabecalho.Categoria,
            cabecalho.Responsavel, c.CriadoEm, c.ResolvidoEm, new DaMatricula(cabecalho.NumeroMatricula, cabecalho.Curso, c.Semestre),
            vemDaEquipe ? cabecalho.Solicitante : null, vemDaEquipe ? c.Resumo : null, equipe ? c.OrigemCategoria : null,
            LinhasDaTranscricao(transcricao, equipe, daEquipe), DasMensagens(mensagens, c), daEquipe.Eventos,
            await AcoesDoChamado(db, c, papel, usuarioId), daEquipe.Setores, daEquipe.Categorias, await DoFluxoDoChamado(db, c, vemDaEquipe));
    }

    public static string Abrangencia(string? curso, int? semestre) =>
        curso is null ? "Todos os cursos" : semestre is null ? curso : $"{curso}, {semestre}º semestre";

    static IReadOnlyList<object> LinhasDaTranscricao(List<LinhaDaTranscricao> transcricao, bool equipe, DaEquipe daEquipe) =>
        [.. transcricao.Select(m => equipe
            ? (object)new TranscricaoDaEquipe(m.Autor, m.Texto, m.CriadaEm, daEquipe.Fontes.GetValueOrDefault(m.Id), m.Autor == MensagemConversa.AutorAluno ? m.Anexos : null)
            : new TranscricaoDoAluno(m.Autor, m.Texto, m.CriadaEm))];

    static IReadOnlyList<DaMensagem> DasMensagens(List<LinhaDaMensagem> mensagens, Chamado c) =>
        [.. mensagens.Select(m => new DaMensagem(m.Id, m.Tipo, m.Texto, m.AutorId is null ? "Sistema" : m.Autor!, m.AutorId == c.SolicitanteId, m.CriadaEm, m.Anexos))];

    static async Task<List<string>> AcoesDoChamado(OneDb db, Chamado c, string papel, long usuarioId)
    {
        var acoes = PermissoesChamado.Acoes(c.Estado, papel, c.ResponsavelId, usuarioId).ToList();
        if (acoes.Contains("subir") && !await ConsultasDeFluxo.TemEtapaSeguinte(db, c)) acoes.Remove("subir");
        return acoes;
    }

    static async Task<DoFluxo?> DoFluxoDoChamado(OneDb db, Chamado c, bool equipe)
    {
        if (!equipe || c.VersaoFluxoId is not { } versaoId || c.EtapaOrdem is not { } ordem) return null;
        var fluxo = await LerFluxo(db, versaoId, ordem);
        return new DoFluxo(fluxo.Versao, ordem, fluxo.Total, fluxo.Destino, Abrangencia(fluxo.Curso, fluxo.Semestre));
    }

    static async Task<DaEquipe> Equipe(OneDb db, Chamado c, Cabecalho cabecalho, List<LinhaDaTranscricao> transcricao, bool completa)
    {
        var eventos = (await LerEventos(db, c))
            .Select(e => new DoEvento(e.Tipo, e.AtorId is null ? "Sistema" : e.Ator!, e.AtorId == c.SolicitanteId, e.De, e.Para, e.Detalhe, e.CriadoEm)).ToList();
        if (!completa) return new DaEquipe(eventos, [], null, null);
        var comCitacao = transcricao.Where(m => m.Citacoes.Count > 0).ToList();
        var fonte = comCitacao.Count > 0 ? await Fontes.Citadas(db, comCitacao.SelectMany(m => m.Citacoes).ToList()) : null;
        var fontes = comCitacao.ToDictionary(m => m.Id, m => m.Citacoes.Select(fonte!));
        return new DaEquipe(eventos, fontes, cabecalho.Setores, cabecalho.Categorias);
    }
}


