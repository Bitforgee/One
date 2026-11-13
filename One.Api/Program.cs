using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using One.Api.Acesso;
using One.Api.Administracao;
using One.Api.Assistente;
using One.Api.Chamados;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Indicadores;
using One.Api.Instituicoes;
using One.Api.Mcp;

namespace One.Api;

public class Program
{
    public static async Task<int> Main(string[] args)
    {
        if (args is ["push", ..]) return PushComando.Rodar(args[1..]);
        var comando = args is ["instituicao", ..];
        var builder = WebApplication.CreateBuilder(args);
        if (comando) builder.Logging.ClearProviders();
        builder.Services.TryAddSingleton(TimeProvider.System);
        builder.Services.AddPersistencia().AddArmazenamento().AddSeguranca().AddTratamentoDeErros()
            .AddAssistente().AddChamados().AddIndexacaoDeTrechos().AddEnvioDePush().AddConhecimento()
            .AddIndicadores().AddInstituicoes().AddAdministracao().AddMcp().AddAcesso();

        var app = builder.Build();
        using (var scope = app.Services.CreateScope())
            scope.ServiceProvider.GetRequiredService<OneDb>().Database.Migrate();

        if (comando)
            return await InstituicaoComando.Rodar(app.Services, args[1..]);

        await app.Services.GetRequiredService<Armazenamento>().Preparar();

        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.UseStaticFiles();
        app.UseAuthentication();
        app.UseAcesso();
        app.UseAuthorization();
        app.UseRateLimiter();

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
}