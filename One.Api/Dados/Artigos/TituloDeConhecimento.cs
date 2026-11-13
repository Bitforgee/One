namespace One.Api.Dados.Artigos;

public static class TituloDeConhecimento
{
    public const int Maximo = 200;

    public static bool Valido(string? titulo) => !string.IsNullOrWhiteSpace(titulo) && titulo.Length <= Maximo;

    public static string Recusa => $"Informe o título, com até {Maximo} caracteres.";
}
