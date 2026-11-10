using System.Net;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MoodleLimiteTests : IAsyncLifetime
{
    readonly OneFactoryComLimites f = new();

    public ValueTask InitializeAsync() => f.InitializeAsync();
    public ValueTask DisposeAsync() => f.DisposeAsync();

    [Fact]
    public async Task Sexta_chamada_429()
    {
        var i = await f.Instituicao();
        await f.PlataformaMoodle(i);
        var c = f.Cliente();
        var login = $"/api/moodle/{i.Slug}/login?iss={Uri.EscapeDataString(MoodleFalso.Emissor)}&client_id={MoodleFalso.ClientId}&login_hint=h";

        for (var n = 0; n < 5; n++) Assert.Equal(HttpStatusCode.Redirect, (await c.GetAsync(login)).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await c.GetAsync(login)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await c.Lancar(i.Slug, "x.y.z", "estado")).StatusCode);
    }
}
