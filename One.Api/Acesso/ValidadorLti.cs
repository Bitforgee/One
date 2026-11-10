using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record DadosLti(string Sub, string? Username);

public sealed class ValidadorLti(IHttpClientFactory http, TimeProvider relogio, ILogger<ValidadorLti> log)
{
    const string Lti = "https://purl.imsglobal.org/spec/lti/claim/";
    static readonly TimeSpan Tolerancia = TimeSpan.FromSeconds(60);

    public async Task<DadosLti?> Validar(PlataformaMoodle p, string idToken, string nonce, CancellationToken ct)
    {
        var chaves = await Chaves(p.JwksUrl, ct);
        if (chaves is null) return null;
        var r = await new JsonWebTokenHandler().ValidateTokenAsync(idToken, Parametros(p, chaves));
        if (!r.IsValid || r.SecurityToken is not JsonWebToken t) return null;
        return Condicoes(t, p, nonce) ? new DadosLti(t.Subject, Username(t)) : null;
    }

    TokenValidationParameters Parametros(PlataformaMoodle p, IList<SecurityKey> chaves) => new()
    {
        ValidIssuer = p.Emissor,
        ValidAudience = p.ClientId,
        IssuerSigningKeys = chaves,
        ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
        RequireSignedTokens = true,
        RequireExpirationTime = true,
        LifetimeValidator = (_, expira, _, _) => expira is not null && expira.Value.Add(Tolerancia) > relogio.GetUtcNow().UtcDateTime,
    };

    async Task<IList<SecurityKey>?> Chaves(string jwksUrl, CancellationToken ct)
    {
        try
        {
            var json = await http.CreateClient("moodle").GetStringAsync(jwksUrl, ct);
            return new JsonWebKeySet(json).GetSigningKeys();
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException or ArgumentException)
        {
            log.LogWarning(e, "Não foi possível obter as chaves do Moodle");
            return null;
        }
    }

    static bool Condicoes(JsonWebToken t, PlataformaMoodle p, string nonce) =>
        t.Subject is { Length: > 0 }
        && Texto(t, "nonce") == nonce
        && Texto(t, Lti + "deployment_id") == p.DeploymentId
        && Texto(t, Lti + "message_type") == "LtiResourceLinkRequest"
        && Texto(t, Lti + "version") == "1.3.0";

    static string? Texto(JsonWebToken t, string claim) => t.TryGetPayloadValue<string>(claim, out var v) ? v : null;

    static string? Username(JsonWebToken t) =>
        t.TryGetPayloadValue<JsonElement>(Lti + "custom", out var custom) && custom.ValueKind == JsonValueKind.Object
            && custom.TryGetProperty("username", out var u) && u.ValueKind == JsonValueKind.String ? u.GetString() : null;
}
