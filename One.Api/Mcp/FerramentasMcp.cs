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
using One.Api.Assistente;
using One.Api.Chamados;
using One.Api.Chamados.Shared;
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
            var itens = Corpo(await mediator.Send(new ListarChamados(qual, estado, usuario))).EnumerateArray().Select(Item).ToList();
            return new ListaDeChamados(itens.Count, [.. itens.Take(MaximoDaLista)]);
        });

    static ChamadoNaLista Item(JsonElement c) =>
        new(Texto(c, "numero")!, Texto(c, "titulo")!, Texto(c, "estado")!, c.GetProperty("criadoEm").GetDateTime(), Texto(c, "categoria"), Texto(c, "responsavel"),
            c.TryGetProperty("dias", out var dias) ? dias.GetInt32() : null);

    [McpServerTool(Name = "ver_chamado", ReadOnly = true)]
    [Description("Abre um chamado pelo número (ex.: ONE-12) com as mensagens e os eventos que o usuário pode ver. Não traz anexos nem o número da matrícula.")]
    public Task<CallToolResult> Ver(ClaimsPrincipal? principal, string numero) =>
        Executar("ver_chamado", principal, async (usuario, _) => Detalhe(Corpo(await mediator.Send(new VerChamado(numero, usuario)))));

    static ChamadoDetalhado Detalhe(JsonElement d)
    {
        var matricula = d.GetProperty("matricula");
        return new ChamadoDetalhado(Texto(d, "numero")!, Texto(d, "titulo")!, Texto(d, "estado")!, Texto(d, "categoria")!, Texto(d, "setor")!, Texto(d, "responsavel"), Texto(d, "solicitante"),
            Texto(matricula, "curso")!, matricula.GetProperty("semestre").GetInt32(), d.GetProperty("criadoEm").GetDateTime(),
            d.TryGetProperty("resolvidoEm", out var resolvido) && resolvido.ValueKind != JsonValueKind.Null ? resolvido.GetDateTime() : null, Texto(d, "resumo"),
            Lista(d, "mensagens", Mensagem), Lista(d, "eventos", Evento));
    }

    static MensagemDoChamado Mensagem(JsonElement m) => new(Texto(m, "tipo")!, Texto(m, "autor")!, Texto(m, "texto")!, m.GetProperty("criadaEm").GetDateTime());

    static EventoDoChamado Evento(JsonElement e) =>
        new(Texto(e, "tipo")!, Texto(e, "ator")!, Texto(e, "de"), Texto(e, "para"), Texto(e, "tipo") == TiposEvento.Anexo ? null : Texto(e, "detalhe"), e.GetProperty("criadoEm").GetDateTime());

    static IReadOnlyList<T> Lista<T>(JsonElement d, string nome, Func<JsonElement, T> ler) =>
        d.TryGetProperty(nome, out var lista) && lista.ValueKind == JsonValueKind.Array ? [.. lista.EnumerateArray().Select(ler)] : [];

    static string? Texto(JsonElement e, string nome) => e.TryGetProperty(nome, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
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

    static JsonElement Corpo(IResult resultado) =>
        resultado is not ProblemHttpResult and IValueHttpResult { Value: { } v } ? JsonSerializer.SerializeToElement(v, JsonSerializerOptions.Web) : throw Erro(resultado);

    static McpException Erro(IResult resultado) =>
        new(resultado is ProblemHttpResult p ? p.ProblemDetails.Detail ?? p.ProblemDetails.Title ?? "Não foi possível concluir." : "Não foi possível concluir.");
    async Task<CallToolResult> Executar<T>(string ferramenta, ClaimsPrincipal? principal, Func<Usuario, Instituicao, Task<T>> acao)
    {
        var (usuario, instituicao) = await Contexto(principal);
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

    async Task<(Usuario, Instituicao)> Contexto(ClaimsPrincipal? principal)
    {
        if (!long.TryParse(principal?.FindFirstValue("sub"), out var usuarioId) || !long.TryParse(principal.FindFirstValue("instituicao_id"), out var instituicaoId))
            throw new McpException("Não autenticado.");
        db.InstituicaoAtual = instituicaoId;
        var usuario = await db.Usuarios.Include(u => u.Papeis).FirstAsync(u => u.Id == usuarioId);
        return (usuario, await db.Instituicoes.FirstAsync(i => i.Id == instituicaoId));
    }
}
