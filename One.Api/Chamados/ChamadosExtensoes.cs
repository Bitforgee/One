using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace One.Api.Chamados;

public static class ChamadosExtensoes
{
    public static IServiceCollection AddChamados(this IServiceCollection s)
    {
        s.AddSignalR();
        s.AddSingleton<AvisarMudanca>();
        s.AddSingleton<IInterceptor>(sp => sp.GetRequiredService<AvisarMudanca>());
        s.AddHttpClient("push");
        s.AddSingleton<IEnviadorPush, EnviadorPush>();
        s.AddMediator(o => { o.ServiceLifetime = ServiceLifetime.Scoped; o.PipelineBehaviors = [typeof(AgirNoChamado<,>)]; });
        s.AddScoped<AcessoChamado>();
        s.AddSingleton<ITarefaAgendada, FecharResolvidos>();
        s.AddSingleton<ITarefaAgendada, ResolverSemResposta>();
        s.AddSingleton<ITarefaAgendada, LembrarAguardando>();
        s.AddSingleton<ITarefaAgendada, SubirPorPrazo>();
        s.AddSingleton<ITarefaAgendada, EnviarEmails>();
        return s;
    }

    public static IServiceCollection AddEnvioDePush(this IServiceCollection s) => s.AddSingleton<ITarefaAgendada, EnviarPushes>();

    public static void MapChamados(this RouteGroupBuilder api)
    {
        ChamadoRotas.Mapear(api);
        PushRotas.Mapear(api);
        api.MapHub<TempoRealHub>("/tempo-real").Add(b =>
        {
            if (b is RouteEndpointBuilder { RoutePattern.RawText: { } t } && t.EndsWith("/negotiate", StringComparison.Ordinal)) b.Metadata.Add(new HttpMethodMetadata(["POST"]));
        });
    }
}