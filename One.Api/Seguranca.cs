using System.Security.Claims;
using System.Threading.RateLimiting;

namespace One.Api;

public static class Seguranca
{
    public static IServiceCollection AddSeguranca(this IServiceCollection s)
    {
        s.AddAuthorization();
        s.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = 429;
            o.AddPolicy("auth", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Limite(c, "Limites:AuthPorMinuto", 5), Window = TimeSpan.FromSeconds(60) }));
            o.AddPolicy("mcp", c => RateLimitPartition.GetFixedWindowLimiter(Tokens.Hash(c.Request.Headers.Authorization.ToString()),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Limite(c, "Limites:McpPorMinuto", 60), Window = TimeSpan.FromSeconds(60) }));
            o.AddPolicy("mensagens", c => RateLimitPartition.GetFixedWindowLimiter(c.User.FindFirstValue("sub") ?? "",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Limite(c, "Limites:MensagensPorMinuto", 10), Window = TimeSpan.FromSeconds(60) }));
        });
        return s;
    }

    static int Limite(HttpContext c, string chave, int padrao) => c.RequestServices.GetRequiredService<IConfiguration>().GetValue(chave, padrao);
}