namespace One.Api;

public static class Cpf
{
    public static string? Normalizar(string? texto)
    {
        if (texto is null) return null;
        var d = texto.Replace(".", "").Replace("-", "");
        if (d.Length != 11 || !d.All(char.IsAsciiDigit)) return null;
        return Digito(d, 9) == d[9] - '0' && Digito(d, 10) == d[10] - '0' ? d : null;
    }

    static int Digito(string d, int n)
    {
        var soma = 0;
        for (var i = 0; i < n; i++) soma += (d[i] - '0') * (n + 1 - i);
        var r = soma * 10 % 11;
        return r == 10 ? 0 : r;
    }

    public static string Mascarar(string cpf) => $"***.{cpf[3..6]}.{cpf[6..9]}-**";
}
