using Microsoft.Extensions.DependencyInjection.Extensions;
using One.Api.Acesso;
using One.Api.Administracao;
using One.Api.Assistente;
using One.Api.Assistente.Busca;
using One.Api.Chamados;
using One.Api.Chamados.Push;
using One.Api.Conhecimento;
using One.Api.Indicadores;
using One.Api.Instituicoes;
using One.Api.Instituicoes.Plataforma;
using One.Api.Mcp;

namespace One.Api;

public class Program
{
    public static async Task<int> Main(string[] args)
    {
        if (Despachar(args, () => Montar(args).Services, Terminal.Saida, Terminal.Erro) is { } comando) return await comando;
        var app = Montar(args);
        await app.Services.GetRequiredService<Armazenamento>().Preparar();
        app.UseTratamentoDeErros();
        app.UseStaticFiles();
        app.UseAuthentication();
        app.UseAcesso();
        app.UseSeguranca();
        app.MapMcp();
        var api = app.MapGroup("/api").RequireAuthorization();
        api.MapAcesso();
        api.MapInstituicoes();
        api.MapAssistente();
        api.MapChamados();
        api.MapConhecimento();
        api.MapAdministracao();
        api.MapIndicadores();
        app.MapFallback("/api/{**resto}", () => Problemas.Erro(404, "Recurso não encontrado."));
        app.MapFallbackToFile("index.html");
        app.Run();
        return 0;
    }

    static WebApplication Montar(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        if (args is ["instituicao", ..]) builder.Logging.ClearProviders();
        builder.Services.TryAddSingleton(TimeProvider.System);
        builder.Services.AddPersistencia().AddArmazenamento().AddSeguranca().AddTratamentoDeErros()
            .AddAssistente().AddChamados().AddIndexacaoDeTrechos().AddEnvioDePush().AddConhecimento()
            .AddIndicadores().AddInstituicoes().AddAdministracao().AddMcp().AddAcesso();
        var app = builder.Build();
        app.Services.MigrarBanco();
        return app;
    }

    public static Task<int>? Despachar(string[] args, Func<IServiceProvider> servicos, TextWriter saida, TextWriter erro) => args switch
    {
        ["push", .. var resto] => Task.FromResult(PushComando.Executar(resto, saida, erro)),
        ["instituicao", "avaliar-busca", ..] => ComandoAvaliarBusca.Executar(servicos(), args[1..], saida, erro),
        ["instituicao", .. var resto] => InstituicaoComando.Executar(servicos(), resto, saida, erro),
        _ => null,
    };
}
