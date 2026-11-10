using Mediator;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record IniciarLoginMoodle(string Slug, IReadOnlyDictionary<string, string?> Parametros) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapMethods("/moodle/{slug}/login", ["GET", "POST"], async (string slug, HttpRequest req, IMediator m) =>
        {
            IEnumerable<KeyValuePair<string, StringValues>> origem = req.HasFormContentType ? await req.ReadFormAsync() : req.Query;
            return await m.Send(new IniciarLoginMoodle(slug, origem.ToDictionary(x => x.Key, x => (string?)x.Value.FirstOrDefault())));
        }).AllowAnonymous().RequireRateLimiting("auth");
}

public sealed class IniciarLoginMoodleHandler(OneDb db, TimeProvider relogio, IConfiguration cfg) : IRequestHandler<IniciarLoginMoodle, IResult>
{
    public async ValueTask<IResult> Handle(IniciarLoginMoodle m, CancellationToken ct)
    {
        var i = await MoodleLti.Ativa(db, m.Slug, ct);
        if (i is null) return MoodleLti.NaoEncontrada();
        string? Valor(string chave) => m.Parametros.GetValueOrDefault(chave);
        var p = await db.PlataformasMoodle.FirstOrDefaultAsync(ct);
        if (p is null || !p.Reconhece(Valor("iss"), Valor("client_id")) || string.IsNullOrEmpty(Valor("login_hint")))
            return Problemas.Erro(400, "O Moodle que chamou não está cadastrado nesta instituição.");

        var (state, nonce) = (MoodleLti.Aleatorio(), MoodleLti.Aleatorio());
        db.LtiLancamentos.Add(LtiLancamento.Abrir(state, nonce, relogio.GetUtcNow().UtcDateTime));
        await db.SaveChangesAsync(ct);

        var consulta = new Dictionary<string, string?>
        {
            ["scope"] = "openid", ["response_type"] = "id_token", ["response_mode"] = "form_post", ["prompt"] = "none",
            ["client_id"] = p.ClientId, ["redirect_uri"] = MoodleLti.Url(cfg, i.Slug, "lancamento"),
            ["login_hint"] = Valor("login_hint"), ["lti_message_hint"] = Valor("lti_message_hint"), ["state"] = state, ["nonce"] = nonce,
        };
        return Results.Redirect(QueryHelpers.AddQueryString(p.AuthUrl, consulta.Where(x => !string.IsNullOrEmpty(x.Value))));
    }
}
