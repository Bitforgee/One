using Mediator;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record ChavesMoodle(string Slug) : IRequest<IResult>
{
    public sealed record Resposta(IReadOnlyList<Resposta.Chave> Keys)
    {
        public sealed record Chave(string Kty, string Alg, string Use, string Kid, string N, string E);
    }

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/moodle/{slug}/jwks", (string slug, IMediator m) => m.Send(new ChavesMoodle(slug))).AllowAnonymous();
}

public sealed class ChavesMoodleHandler(OneDb db, ChaveLti chave) : IRequestHandler<ChavesMoodle, IResult>
{
    public async ValueTask<IResult> Handle(ChavesMoodle m, CancellationToken ct) =>
        await MoodleLti.Ativa(db, m.Slug, ct) is null
            ? MoodleLti.NaoEncontrada()
            : Results.Ok(new ChavesMoodle.Resposta([new("RSA", "RS256", "sig", chave.Kid, chave.Modulo, chave.Expoente)]));
}
