namespace One.Api.Conhecimento;

public static class ConhecimentoExtensoes
{
    public static IServiceCollection AddConhecimento(this IServiceCollection s) => s;

    public static void MapConhecimento(this RouteGroupBuilder api)
    {
        VerVersaoArtigo.Mapear(api);
        BaixarVersaoDocumento.Mapear(api);
        var admin = api.MapAdmin();
        ListarArtigos.Mapear(admin);
        CriarArtigo.Mapear(admin);
        AlterarArtigo.Mapear(admin);
        AtivarArtigo.Mapear(admin);
        ArquivarArtigo.Mapear(admin);
        ListarDocumentos.Mapear(admin);
        CriarDocumento.Mapear(admin);
        NovaVersaoDocumento.Mapear(admin);
        ArquivarDocumento.Mapear(admin);
    }
}
