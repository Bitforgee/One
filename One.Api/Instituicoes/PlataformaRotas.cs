using One.Api.Dados;

namespace One.Api.Instituicoes;

public static class PlataformaRotas
{
    public const string NaoEOperador = "Só operadores da plataforma podem usar esta área.";
    public const string NaoEncontrada = "Instituição não encontrada.";

    public static void Mapear(RouteGroupBuilder api)
    {
        var plataforma = api.MapGroup("/plataforma").AddEndpointFilter(async (c, next) =>
            c.HttpContext.Usuario().Tem(Papeis.Operador) ? await next(c) : Problemas.Erro(403, NaoEOperador));

        ListarInstituicoes.Mapear(plataforma);
        CriarInstituicao.Mapear(plataforma);
        ImportarCargaInstituicao.Mapear(plataforma);
        DesativarInstituicao.Mapear(plataforma);
        ReativarInstituicao.Mapear(plataforma);
        ReenviarAcesso.Mapear(plataforma);
    }
}
