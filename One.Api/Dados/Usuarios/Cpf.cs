namespace One.Api.Dados.Usuarios;

public sealed record Cpf
{
    Cpf(string valor) => Valor = valor;

    public string Valor { get; }

    public string Mascarado => $"***.{Valor[3..6]}.{Valor[6..9]}-**";

    public static Cpf? Tentar(string? texto)
    {
        if (texto is null) return null;
        var d = texto.Replace(".", "").Replace("-", "");
        if (d.Length != 11 || !d.All(char.IsAsciiDigit)) return null;
        return Digito(d, 9) == d[9] - '0' && Digito(d, 10) == d[10] - '0' ? new Cpf(d) : null;
    }

    public static Cpf Ler(string gravado) => new(gravado);

    public override string ToString() => Valor;

    static int Digito(string d, int n)
    {
        var soma = 0;
        for (var i = 0; i < n; i++) soma += (d[i] - '0') * (n + 1 - i);
        var r = soma * 10 % 11;
        return r == 10 ? 0 : r;
    }
}