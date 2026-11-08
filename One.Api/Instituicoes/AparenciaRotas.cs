namespace One.Api.Instituicoes;

public static class AparenciaRotas
{
    public static void Mapear(RouteGroupBuilder api)
    {
        BaixarImagemInstituicao.Mapear(api);
        ManifestoInstituicao.Mapear(api);
    }

    public static void MapearAdmin(RouteGroupBuilder admin)
    {
        VerAparencia.Mapear(admin);
        AlterarAparencia.Mapear(admin);
        EnviarImagemInstituicao.Mapear(admin);
        RemoverImagemInstituicao.Mapear(admin);
    }
}
