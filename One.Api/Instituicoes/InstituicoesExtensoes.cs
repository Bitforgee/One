using One.Api.Dados;
using One.Api.Instituicoes.Aparencia;
using One.Api.Instituicoes.Carga;
using One.Api.Instituicoes.Plataforma;

namespace One.Api.Instituicoes;

public static class InstituicoesExtensoes
{
    public static IServiceCollection AddInstituicoes(this IServiceCollection s) => s;

    public static void MapInstituicoes(this RouteGroupBuilder api)
    {
        BaixarImagemInstituicao.Mapear(api);
        ManifestoInstituicao.Mapear(api);
        var admin = api.MapAdmin();
        VerAparencia.Mapear(admin);
        AlterarAparencia.Mapear(admin);
        EnviarImagemInstituicao.Mapear(admin);
        RemoverImagemInstituicao.Mapear(admin);
        var plataforma = api.MapGroup("/plataforma").AddEndpointFilter(async (c, next) =>
            c.HttpContext.Usuario().Tem(Papeis.Operador) ? await next(c) : Problemas.Erro(403, ErrosDaPlataforma.NaoEOperador));
        ListarInstituicoes.Mapear(plataforma);
        CriarInstituicao.Mapear(plataforma);
        ImportarCargaInstituicao.Mapear(plataforma);
        DesativarInstituicao.Mapear(plataforma);
        ReativarInstituicao.Mapear(plataforma);
        ReenviarAcesso.Mapear(plataforma);
    }
}
