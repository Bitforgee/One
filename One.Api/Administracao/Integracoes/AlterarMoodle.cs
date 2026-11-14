using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao.Integracoes;

public sealed record AlterarMoodle(AlterarMoodle.Entrada Corpo) : IRequest<IResult>
{
    const int Maximo = 500;

    public sealed record Entrada(bool? Ativa, string? Emissor, string? ClientId, string? DeploymentId, string? AuthUrl, string? JwksUrl);

    public sealed record Resposta : MoodleDados
    {
        public Resposta(MoodleDados d) : base(d) { }
    }

    public static void Mapear(RouteGroupBuilder g) => g.MapPut("/moodle", (Entrada e, IMediator m) => m.Send(new AlterarMoodle(e)));

    static string? Limpo(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    public static Entrada Normalizar(Entrada e) => new(e.Ativa, Limpo(e.Emissor), Limpo(e.ClientId), Limpo(e.DeploymentId), Limpo(e.AuthUrl), Limpo(e.JwksUrl));

    static bool UrlAceita(string texto, bool desenvolvimento) =>
        Uri.TryCreate(texto, UriKind.Absolute, out var u)
        && (u.Scheme == Uri.UriSchemeHttps || (desenvolvimento && u.Scheme == Uri.UriSchemeHttp && u.Host is "localhost" or "127.0.0.1"));

    public static IResult? Validar(Entrada e, bool desenvolvimento)
    {
        (string Campo, string Rotulo, string? Valor, bool EhUrl)[] campos =
        [
            ("emissor", "O emissor", e.Emissor, false),
            ("clientId", "O client_id", e.ClientId, false),
            ("deploymentId", "O deployment_id", e.DeploymentId, false),
            ("authUrl", "A URL de autenticação", e.AuthUrl, true),
            ("jwksUrl", "A URL das chaves", e.JwksUrl, true),
        ];
        foreach (var (campo, rotulo, valor, ehUrl) in campos)
        {
            if (valor is null) return Problemas.Invalido($"{rotulo} é obrigatório.", campo);
            if (valor.Length > Maximo) return Problemas.Invalido($"{rotulo} aceita até {Maximo} caracteres.", campo);
            if (ehUrl && !UrlAceita(valor, desenvolvimento)) return Problemas.Invalido($"{rotulo} deve começar com https://.", campo);
        }
        return null;
    }
}

public sealed class AlterarMoodleHandler(OneDb db, IConfiguration cfg, IHostEnvironment ambiente) : IRequestHandler<AlterarMoodle, IResult>
{
    public async ValueTask<IResult> Handle(AlterarMoodle m, CancellationToken ct)
    {
        var e = AlterarMoodle.Normalizar(m.Corpo);
        if (AlterarMoodle.Validar(e, ambiente.IsDevelopment()) is { } erro) return erro;
        var i = await db.Instituicoes.SingleAsync(x => x.Id == db.InstituicaoAtual, ct);
        var p = await db.PlataformasMoodle.FirstOrDefaultAsync(ct);
        if (p is null) db.PlataformasMoodle.Add(p = new PlataformaMoodle());
        p.Configurar(e.Ativa ?? true, e.Emissor!, e.ClientId!, e.DeploymentId!, e.AuthUrl!, e.JwksUrl!);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new AlterarMoodle.Resposta(MoodleDados.De(p, cfg, i.Slug)));
    }
}
