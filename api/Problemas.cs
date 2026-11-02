namespace One.Api;

public static class Problemas
{
    public static string Titulo(int status) => status switch
    {
        400 => "Requisição inválida",
        401 => "Não autenticado",
        403 => "Acesso negado",
        404 => "Não encontrado",
        409 => "Conflito",
        413 => "Arquivo grande demais",
        415 => "Tipo de arquivo não aceito",
        429 => "Muitas requisições",
        >= 500 => "Erro interno",
        _ => "Erro na requisição",
    };

    public static string Detalhe(int status) => status switch
    {
        400 => "Os dados enviados são inválidos.",
        401 => "Faça login para continuar.",
        403 => "Você não tem permissão para esta ação.",
        404 => "Recurso não encontrado.",
        409 => "A ação não é permitida no estado atual.",
        413 => "O arquivo passa do tamanho permitido.",
        415 => "O tipo do arquivo não é aceito.",
        429 => "Muitas tentativas. Aguarde um minuto e tente de novo.",
        >= 500 => "Ocorreu um erro inesperado. Tente de novo.",
        _ => "Não foi possível concluir a requisição.",
    };

    public static IResult Erro(int status, string detalhe) =>
        Results.Problem(detail: detalhe, statusCode: status, title: Titulo(status));

    public static IResult Invalido(string detalhe, string campo) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [campo] = [detalhe] }, detail: detalhe, title: Titulo(400));
}
