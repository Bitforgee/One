using Mediator;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Chamados.Permissao;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class MediatorTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public void Um_mediator_por_escopo()
    {
        using var um = f.Services.CreateScope();
        using var outro = f.Services.CreateScope();
        Assert.Same(um.ServiceProvider.GetRequiredService<IMediator>(), um.ServiceProvider.GetRequiredService<IMediator>());
        Assert.NotSame(um.ServiceProvider.GetRequiredService<IMediator>(), outro.ServiceProvider.GetRequiredService<IMediator>());
        Assert.Same(um.ServiceProvider.GetRequiredService<AcessoChamado>(), um.ServiceProvider.GetRequiredService<AcessoChamado>());
        Assert.NotSame(um.ServiceProvider.GetRequiredService<AcessoChamado>(), outro.ServiceProvider.GetRequiredService<AcessoChamado>());
    }

    [Fact]
    public void AgirNoChamado_so_nas_10_acoes()
    {
        using var escopo = f.Services.CreateScope();
        var mensagens = ArquiteturaTests.Mensagens();
        Assert.Equal(87, mensagens.Count);
        var (acoes, outras) = (0, 0);
        foreach (var (mensagem, resposta) in mensagens)
        {
            var behaviors = escopo.ServiceProvider.GetServices(typeof(IPipelineBehavior<,>).MakeGenericType(mensagem, resposta)).ToList();
            if (typeof(IAcaoChamado).IsAssignableFrom(mensagem))
            {
                acoes++;
                Assert.Equal(typeof(AgirNoChamado<,>).MakeGenericType(mensagem, resposta), Assert.Single(behaviors)!.GetType());
            }
            else
            {
                outras++;
                Assert.True(behaviors.Count == 0, $"{mensagem.Name}: {behaviors.Count} behaviors");
            }
        }
        Assert.Equal((10, 77), (acoes, outras));
    }
}
