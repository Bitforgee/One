using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using One.Api.Dados;

namespace One.Api;

public static class Persistencia
{
    public static IServiceCollection AddPersistencia(this IServiceCollection s)
    {
        s.AddDbContext<OneDb>((sp, o) => o.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("One"), n => n.UseVector()).AddInterceptors(sp.GetServices<IInterceptor>()));
        s.AddSingleton<EnviadorSmtp>();
        s.AddSingleton(sp => Prazos.Ler(sp.GetRequiredService<IConfiguration>()));
        s.AddSingleton<Agendador>();
        s.AddHostedService(sp => sp.GetRequiredService<Agendador>());
        return s;
    }

    public static void MigrarBanco(this IServiceProvider servicos)
    {
        using var escopo = servicos.CreateScope();
        escopo.ServiceProvider.GetRequiredService<OneDb>().Database.Migrate();
    }
}
