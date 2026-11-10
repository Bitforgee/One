using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace One.Api.Tests.Infra;

public sealed class MoodleFalso : HttpMessageHandler
{
    public const string Emissor = "https://moodle.teste";
    public const string ClientId = "cliente-one";
    public const string DeploymentId = "1";
    public const string AuthUrl = "https://moodle.teste/mod/lti/auth.php";
    public const string JwksUrl = "https://moodle.teste/mod/lti/certs.php";
    public const string Lti = "https://purl.imsglobal.org/spec/lti/claim/";
    const string Kid = "chave-do-moodle";

    readonly RSA chave = RSA.Create(2048);
    public RSA OutraChave { get; } = RSA.Create(2048);
    public bool JwksFora { get; set; }
    public int PedidosDeChaves;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
    {
        if (r.RequestUri?.ToString() != JwksUrl) return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.NotFound));
        Interlocked.Increment(ref PedidosDeChaves);
        if (JwksFora) throw new HttpRequestException("moodle fora do ar");
        var p = chave.ExportParameters(false);
        var json = JsonSerializer.Serialize(new
        {
            keys = new[] { new { kty = "RSA", alg = "RS256", use = "sig", kid = Kid, n = WebEncoders.Base64UrlEncode(p.Modulus!), e = WebEncoders.Base64UrlEncode(p.Exponent!) } },
        });
        return Task.FromResult(new HttpResponseMessage { Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json") });
    }

    public Dictionary<string, object?> Corpo(string nonce, DateTimeOffset agora, string sub, string? username)
    {
        var d = new Dictionary<string, object?>
        {
            ["iss"] = Emissor, ["aud"] = ClientId, ["sub"] = sub,
            ["iat"] = agora.ToUnixTimeSeconds(), ["exp"] = agora.AddMinutes(5).ToUnixTimeSeconds(), ["nonce"] = nonce,
            [Lti + "deployment_id"] = DeploymentId, [Lti + "message_type"] = "LtiResourceLinkRequest", [Lti + "version"] = "1.3.0",
        };
        if (username is not null) d[Lti + "custom"] = new Dictionary<string, object?> { ["username"] = username };
        return d;
    }

    public string Assinar(Dictionary<string, object?> corpo, bool comOutraChave = false) =>
        new JsonWebTokenHandler().CreateToken(JsonSerializer.Serialize(corpo),
            new SigningCredentials(new RsaSecurityKey(comOutraChave ? OutraChave : chave) { KeyId = Kid }, SecurityAlgorithms.RsaSha256));
}
