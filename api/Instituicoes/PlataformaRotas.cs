using One.Api.Dados;

namespace One.Api.Instituicoes;

// Door 2: o grupo /api/plataforma só atende quem tem o papel OPERADOR; a instituição alvo vem do {slug} da URL.
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
