namespace One.Api.Indicadores;

public static class IndicadorRotas
{
    public static void Mapear(RouteGroupBuilder api) => ConsultarIndicadores.Mapear(api);
}
