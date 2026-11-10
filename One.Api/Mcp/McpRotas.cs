using Microsoft.AspNetCore.Authorization;

namespace One.Api.Mcp;

public static class McpRotas
{
    public static void Mapear(WebApplication app) =>
        app.MapGroup("/api/mcp/{slug}")
            .RequireAuthorization(new AuthorizeAttribute { AuthenticationSchemes = AutenticacaoMcp.Esquema })
            .RequireRateLimiting("mcp")
            .MapMcp();
}
