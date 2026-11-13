namespace One.Api.Administracao;

public static class AdministracaoExtensoes
{
    public static IServiceCollection AddAdministracao(this IServiceCollection s) => s;

    public static void MapAdministracao(this RouteGroupBuilder api)
    {
        var admin = api.MapAdmin();
        ListarUsuarios.Mapear(admin);
        CriarUsuario.Mapear(admin);
        AlterarUsuario.Mapear(admin);
        DesativarUsuario.Mapear(admin);
        ImportarMatriculas.Mapear(admin);
        ListarSetores.Mapear(admin);
        CriarSetor.Mapear(admin);
        AlterarSetor.Mapear(admin);
        ListarCategorias.Mapear(admin);
        CriarCategoria.Mapear(admin);
        AlterarCategoria.Mapear(admin);
        ListarCursos.Mapear(admin);
        CriarCurso.Mapear(admin);
        AlterarCurso.Mapear(admin);
        ListarRespostasProntas.Mapear(admin);
        CriarRespostaPronta.Mapear(admin);
        AlterarRespostaPronta.Mapear(admin);
        ListarFluxos.Mapear(admin);
        CriarFluxo.Mapear(admin);
        SalvarRascunho.Mapear(admin);
        DescartarRascunho.Mapear(admin);
        PublicarFluxo.Mapear(admin);
        SimularFluxo.Mapear(admin);
        VerMoodle.Mapear(admin);
        AlterarMoodle.Mapear(admin);
        VerMcp.Mapear(admin);
        CriarTokenMcp.Mapear(admin);
        RevogarTokenMcp.Mapear(admin);
    }
}
