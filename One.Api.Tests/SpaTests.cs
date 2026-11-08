using System.Net;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class SpaTests
{
    [Fact]
    public async Task Spa_em_slug_e_api_404_em_problem_json()
    {
        var wwwroot = Directory.CreateTempSubdirectory("one-wwwroot-").FullName;
        await File.WriteAllTextAsync(Path.Combine(wwwroot, "index.html"), "<!doctype html><title>One</title><div id=\"raiz\">spa-one</div>");
        await using var f = new OneFactory { WebRoot = wwwroot };
        await f.InitializeAsync();

        var spa = await f.Cliente().GetAsync("/univag/assistente");
        var api = await f.Cliente().GetAsync("/api/inexistente");

        Assert.Equal(HttpStatusCode.OK, spa.StatusCode);
        Assert.Equal("text/html", spa.Content.Headers.ContentType?.MediaType);
        Assert.Contains("spa-one", await spa.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.NotFound, api.StatusCode);
        Assert.Equal("application/problem+json", api.Content.Headers.ContentType?.MediaType);
        Assert.DoesNotContain("spa-one", await api.Content.ReadAsStringAsync());
    }
}
