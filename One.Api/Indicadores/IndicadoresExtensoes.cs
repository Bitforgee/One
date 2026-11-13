namespace One.Api.Indicadores;

public static class IndicadoresExtensoes
{
    public static IServiceCollection AddIndicadores(this IServiceCollection s) => s;

    public static void MapIndicadores(this RouteGroupBuilder api) => IndicadorRotas.Mapear(api);
}