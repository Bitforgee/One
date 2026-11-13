using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Administracao;

public static class AdminRotas
{
    public static IResult NaoEncontrado() => Problemas.Erro(404, "Item não encontrado.");
    public static IResult Repetido(string detalhe) => Problemas.Erro(409, detalhe);
    public static bool Nome(string? n, int max = 100) => !string.IsNullOrWhiteSpace(n) && n.Length <= max;

    public static void Mapear(RouteGroupBuilder api)
    {
        var admin = api.MapGroup("/admin").AddEndpointFilter(async (c, next) =>
            c.HttpContext.Usuario().Tem(Papeis.Administrador) ? await next(c) : Problemas.Erro(403, "Só administradores podem usar esta área."));

        ListarUsuarios.Mapear(admin);
        CriarUsuario.Mapear(admin);
        AlterarUsuario.Mapear(admin);
        DesativarUsuario.Mapear(admin);
        ImportacaoRotas.Mapear(admin);
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
        FluxoRotas.Mapear(admin);
        ArtigoRotas.MapearAdmin(admin);
        DocumentoRotas.MapearAdmin(admin);
        Instituicoes.AparenciaRotas.MapearAdmin(admin);
        VerMoodle.Mapear(admin);
        AlterarMoodle.Mapear(admin);
        VerMcp.Mapear(admin);
        CriarTokenMcp.Mapear(admin);
        RevogarTokenMcp.Mapear(admin);
    }
}
