namespace One.Api.Administracao;

public static class ImportacaoRotas
{
    public static void Mapear(RouteGroupBuilder admin) => ImportarMatriculas.Mapear(admin);
}
