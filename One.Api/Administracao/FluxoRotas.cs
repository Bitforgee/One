namespace One.Api.Administracao;

public static class FluxoRotas
{
    public static void Mapear(RouteGroupBuilder admin)
    {
        ListarFluxos.Mapear(admin);
        CriarFluxo.Mapear(admin);
        SalvarRascunho.Mapear(admin);
        DescartarRascunho.Mapear(admin);
        PublicarFluxo.Mapear(admin);
        SimularFluxo.Mapear(admin);
    }
}
