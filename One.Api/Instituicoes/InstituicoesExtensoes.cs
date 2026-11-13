namespace One.Api.Instituicoes;

public static class InstituicoesExtensoes
{
    public static IServiceCollection AddInstituicoes(this IServiceCollection s) => s;

    public static void MapInstituicoes(this RouteGroupBuilder api)
    {
        AparenciaRotas.Mapear(api);
        PlataformaRotas.Mapear(api);
    }
}