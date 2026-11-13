namespace One.Api.Conhecimento;

public static class ConhecimentoExtensoes
{
    public static IServiceCollection AddConhecimento(this IServiceCollection s) => s;

    public static void MapConhecimento(this RouteGroupBuilder api)
    {
        ArtigoRotas.Mapear(api);
        DocumentoRotas.Mapear(api);
    }
}