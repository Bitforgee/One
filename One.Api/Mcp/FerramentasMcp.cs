using System.ComponentModel;
using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using Mediator;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using One.Api.Assistente.Busca;
using One.Api.Assistente.Respostas;
using One.Api.Chamados.Consulta;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Indicadores;

namespace One.Api.Mcp;

[McpServerToolType]
public sealed class FerramentasMcp(OneDb db, IMediator mediator, Embeddings embeddings, TimeProvider relogio, ILogger<FerramentasMcp> log)
{
    public const int MaximoDaLista = 50;
    public const int MaximoDaConsulta = 500;
    public const int LimitePadrao = 5;
    public const int LimiteMaximo = 10;
    static readonly string[] Estados = [EstadosChamado.Aberto, EstadosChamado.EmAtendimento, EstadosChamado.AguardandoAluno, EstadosChamado.Resolvido, EstadosChamado.Fechado];

    [McpServerTool(Name = "listar_chamados", ReadOnly = true)]
    [Description("Lista chamados do One. escopo 'fila' (padrão): a fila dos setores do usuário; 'meus': os que ele abriu. estado opcional: ABERTO, EM_ATENDIMENTO, AGUARDANDO_ALUNO, RESOLVIDO ou FECHADO. Devolve até 50 itens e o total.")]
    public Task<CallToolResult> Listar(ClaimsPrincipal? principal, string? escopo = null, string? estado = null) =>
        Executar("listar_chamados", principal, async (usuario, _) =>
        {
            var qual = escopo ?? "fila";
            if (qual is not ("fila" or "meus")) throw new McpException("O escopo deve ser 'fila' ou 'meus'.");
            if (estado is not null && !Estados.Contains(estado)) throw new McpException($"O estado deve ser um destes: {string.Join(", ", Estados)}.");
            var itens = Itens(await mediator.Send(new ListarChamados(qual, estado, usuario)));
            return new ListaDeChamados(itens.Count, [.. itens.Take(MaximoDaLista)]);
        });

    static List<ChamadoNaLista> Itens(IResult resultado) => resultado switch
    {
        ProblemHttpResult => throw Erro(resultado),
        IValueHttpResult { Value: IEnumerable<ListarChamados.RespostaDaFila> fila } =>
            [.. fila.Select(c => new ChamadoNaLista(c.Numero, c.Titulo, c.Estado, c.CriadoEm, c.Categoria, c.Responsavel, c.Dias))],
        IValueHttpResult { Value: IEnumerable<ListarChamados.Resposta> meus } => [.. meus.Select(c => new ChamadoNaLista(c.Numero, c.Titulo, c.Estado, c.CriadoEm, null, null, null))],
        _ => throw Erro(resultado),
    };

    [McpServerTool(Name = "ver_chamado", ReadOnly = true)]
    [Description("Abre um chamado pelo número (ex.: ONE-12) com as mensagens e os eventos que o usuário pode ver. Não traz anexos nem o número da matrícula.")]
    public Task<CallToolResult> Ver(ClaimsPrincipal? principal, string numero) =>
        Executar("ver_chamado", principal, async (usuario, _) => Detalhe(Lido<DetalheLido>(await mediator.Send(new VerChamado(numero, usuario)))));

    sealed record MatriculaLida(string Curso, int Semestre);

    sealed record DetalheLido(
        string Numero, string Titulo, string Estado, string Categoria, string Setor, string? Responsavel, string? Solicitante, MatriculaLida Matricula, DateTime CriadoEm,
        DateTime? ResolvidoEm, string? Resumo, IReadOnlyList<MensagemDoChamado>? Mensagens, IReadOnlyList<EventoDoChamado>? Eventos);

    static ChamadoDetalhado Detalhe(DetalheLido d) =>
        new(d.Numero, d.Titulo, d.Estado, d.Categoria, d.Setor, d.Responsavel, d.Solicitante, d.Matricula.Curso, d.Matricula.Semestre, d.CriadoEm, d.ResolvidoEm, d.Resumo,
            d.Mensagens ?? [], [.. (d.Eventos ?? []).Select(e => e.Tipo == TiposEvento.Anexo ? e with { Detalhe = null } : e)]);

    [McpServerTool(Name = "buscar_conhecimento", ReadOnly = true)]
    [Description("Busca na base de conhecimento da instituição (artigos e documentos ativos) os trechos mais próximos da consulta. consulta: 1 a 500 caracteres. limite: 1 a 10 (padrão 5).")]
    public Task<CallToolResult> Buscar(ClaimsPrincipal? principal, string consulta, int? limite = null) =>
        Executar("buscar_conhecimento", principal, async (usuario, instituicao) =>
        {
            var k = limite ?? LimitePadrao;
            if (string.IsNullOrWhiteSpace(consulta) || consulta.Length > MaximoDaConsulta) throw new McpException($"A consulta deve ter de 1 a {MaximoDaConsulta} caracteres.");
            if (k is < 1 or > LimiteMaximo) throw new McpException($"O limite deve ficar entre 1 e {LimiteMaximo}.");
            if (await db.SoLideranca(usuario)) throw new McpException("Seu papel não tem acesso à base de conhecimento.");
            var fontes = await BuscarFontes.Buscar(db, await Vetor(consulta), Hoje(instituicao), k);
            return new ResultadoDaBusca([.. fontes.Select(f => new FonteDeConhecimento(f.ArtigoId is null ? "DOCUMENTO" : "ARTIGO", f.Titulo, f.Texto, f.Links))]);
        });

    async Task<float[]> Vetor(string consulta)
    {
        try
        {
            return (await embeddings.Gerar([Mascara.Aplicar(consulta)]))[0];
        }
        catch (Exception e) when (e is HttpRequestException or System.Text.Json.JsonException or OperationCanceledException)
        {
            throw new McpException("A busca está indisponível agora. Tente de novo em instantes.");
        }
    }

    DateOnly Hoje(Instituicao i) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(relogio.GetUtcNow().UtcDateTime, TimeZoneInfo.FindSystemTimeZoneById(i.Fuso)));

    [McpServerTool(Name = "ver_indicadores", ReadOnly = true)]
    [Description("Indicadores de atendimento do período. de e ate no formato yyyy-MM-dd. setorId opcional para um setor.")]
    public Task<CallToolResult> Indicadores(ClaimsPrincipal? principal, string? de = null, string? ate = null, long? setorId = null) =>
        Executar("ver_indicadores", principal, async (usuario, instituicao) =>
            Valor<Resultado>(await mediator.Send(new ConsultarIndicadores(Data(de), Data(ate), setorId, usuario, instituicao))));

    static DateOnly? Data(string? texto)
    {
        if (texto is null) return null;
        return DateOnly.TryParseExact(texto, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : throw new McpException("Use datas no formato yyyy-MM-dd.");
    }

    static T Valor<T>(IResult resultado) => resultado is not ProblemHttpResult and IValueHttpResult { Value: T v } ? v : throw Erro(resultado);

    static T Lido<T>(IResult resultado) =>
        resultado is not ProblemHttpResult and IValueHttpResult { Value: { } v } ? JsonSerializer.SerializeToElement(v, JsonSerializerOptions.Web).Deserialize<T>(JsonSerializerOptions.Web)! : throw Erro(resultado);

    static McpException Erro(IResult resultado) =>
        new(resultado is ProblemHttpResult p ? p.ProblemDetails.Detail ?? p.ProblemDetails.Title ?? "Não foi possível concluir." : "Não foi possível concluir.");
    async Task<CallToolResult> Executar<T>(string ferramenta, ClaimsPrincipal? principal, Func<Usuario, Instituicao, Task<T>> acao)
    {
        var (usuario, instituicao) = await ContextoMcp.Carregar(db, principal);
        try
        {
            var resultado = await acao(usuario, instituicao);
            Registrar(ferramenta, usuario, instituicao, "ok");
            return new CallToolResult { Content = [new TextContentBlock { Text = JsonSerializer.Serialize(resultado, McpJsonUtilities.DefaultOptions) }] };
        }
        catch (McpException e)
        {
            Registrar(ferramenta, usuario, instituicao, "erro");
            return new CallToolResult { IsError = true, Content = [new TextContentBlock { Text = e.Message }] };
        }
        catch (Exception)
        {
            Registrar(ferramenta, usuario, instituicao, "erro");
            throw;
        }
    }

    void Registrar(string ferramenta, Usuario usuario, Instituicao instituicao, string resultado) =>
        log.LogInformation("Ferramenta MCP {Ferramenta} do usuário {UsuarioId} na instituição {InstituicaoId}: {Resultado}", ferramenta, usuario.Id, instituicao.Id, resultado);
}
