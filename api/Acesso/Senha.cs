namespace One.Api.Acesso;

public static class Senha
{
    public const int Minimo = 8;
    public const int Maximo = 128;

    public static readonly string ForaDoTamanho = $"A senha deve ter de {Minimo} a {Maximo} caracteres.";

    public static bool Valida(string? s) => s is { Length: >= Minimo and <= Maximo };
}
