using Mediator;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// vertical-slice-completa: o registro do Mediator no app do teste (door 2 e door 5).
public class MediatorTests(OneFactory f) : IClassFixture<OneFactory>
{
    // C9: um mediator por escopo de requisição
    [Fact]
    public void Um_mediator_por_escopo()
    {
        using var um = f.Services.CreateScope();
        using var outro = f.Services.CreateScope();
        Assert.Same(um.ServiceProvider.GetRequiredService<IMediator>(), um.ServiceProvider.GetRequiredService<IMediator>());
        Assert.NotSame(um.ServiceProvider.GetRequiredService<IMediator>(), outro.ServiceProvider.GetRequiredService<IMediator>());
    }
}
