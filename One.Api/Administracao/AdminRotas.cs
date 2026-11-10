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

        UsuarioRotas.Mapear(admin);
        ImportacaoRotas.Mapear(admin);
        CadastroRotas.Mapear(admin);
        FluxoRotas.Mapear(admin);
        ArtigoRotas.MapearAdmin(admin);
        DocumentoRotas.MapearAdmin(admin);
        Instituicoes.AparenciaRotas.MapearAdmin(admin);
        VerMoodle.Mapear(admin);
        AlterarMoodle.Mapear(admin);
    }
}
