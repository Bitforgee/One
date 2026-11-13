using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.AspNetCore;

namespace One.Api.Mcp;

public static class McpExtensoes
{
    public static IServiceCollection AddMcp(this IServiceCollection s)
    {
        s.AddMcpServer().WithHttpTransport(o => o.SessionMode = HttpServerSessionMode.Stateless).WithTools<FerramentasMcp>();
        s.AddAuthentication().AddScheme<AuthenticationSchemeOptions, AutenticacaoMcp>(AutenticacaoMcp.Esquema, null);
        return s;
    }

    public static void MapMcp(this WebApplication app) =>
        app.MapGroup("/api/mcp/{slug}")
            .RequireAuthorization(new AuthorizeAttribute { AuthenticationSchemes = AutenticacaoMcp.Esquema })
            .RequireRateLimiting("mcp")
            .MapMcp();
}