using System.Net;
using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MoodleChavesTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Jwks_publica_so_a_chave_publica()
    {
        var i = await f.Instituicao();

        var r = await f.Cliente().GetAsync($"/api/moodle/{i.Slug}/jwks");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var chave = Assert.Single((await r.Json()).GetProperty("keys").EnumerateArray());
        Assert.Equal(["kty", "alg", "use", "kid", "n", "e"], chave.EnumerateObject().Select(p => p.Name));
        Assert.Equal("RSA", chave.GetProperty("kty").GetString());
        Assert.Equal("RS256", chave.GetProperty("alg").GetString());
        Assert.Equal("sig", chave.GetProperty("use").GetString());
        Assert.False(string.IsNullOrEmpty(chave.GetProperty("kid").GetString()));
        using var rsa = RSA.Create();
        rsa.ImportFromPem(OneFactory.PemDaFerramenta);
        var esperado = rsa.ExportParameters(false);
        Assert.Equal(WebEncoders.Base64UrlEncode(esperado.Modulus!), chave.GetProperty("n").GetString());
        Assert.Equal(WebEncoders.Base64UrlEncode(esperado.Exponent!), chave.GetProperty("e").GetString());
    }
}
