namespace One.Api.Chamados;

public static class PushRotas
{
    public static void Mapear(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/push");
        VerChavePush.Mapear(g);
        AtivarPush.Mapear(g);
        DesativarPush.Mapear(g);
    }

    public const string NaoConfigurado = "Os avisos no aparelho não estão configurados.";
}
