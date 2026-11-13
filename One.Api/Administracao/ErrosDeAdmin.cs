namespace One.Api.Administracao;

public static class ErrosDeAdmin
{
    public static IResult NaoEncontrado() => Problemas.Erro(404, "Item não encontrado.");

    public static IResult Repetido(string detalhe) => Problemas.Erro(409, detalhe);
}
