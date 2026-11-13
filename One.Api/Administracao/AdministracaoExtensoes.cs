namespace One.Api.Administracao;

public static class AdministracaoExtensoes
{
    public static IServiceCollection AddAdministracao(this IServiceCollection s) => s;

    public static void MapAdministracao(this RouteGroupBuilder api) => AdminRotas.Mapear(api);
}