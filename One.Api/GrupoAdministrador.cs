using One.Api.Dados;

namespace One.Api;

public static class GrupoAdministrador
{
    public static RouteGroupBuilder MapAdmin(this RouteGroupBuilder api) =>
        api.MapGroup("/admin").AddEndpointFilter(async (c, next) =>
            c.HttpContext.Usuario().Tem(Papeis.Administrador) ? await next(c) : Problemas.Erro(403, "Só administradores podem usar esta área."));
}
