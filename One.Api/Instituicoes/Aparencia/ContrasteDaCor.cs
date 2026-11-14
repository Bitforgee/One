using System.Text.RegularExpressions;

namespace One.Api.Instituicoes.Aparencia;

public static partial class ContrasteDaCor
{
    public const double Minimo = 4.5;
    public const string Recusa = "Escolha uma cor mais escura: o texto branco precisa de contraste 4,5:1 sobre ela.";

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")] private static partial Regex Formato();

    public static bool Aceita(string? cor) => cor is not null && Formato().IsMatch(cor) && ContrasteComBranco(cor) >= Minimo;

    public static double ContrasteComBranco(string hex)
    {
        double Canal(int inicio)
        {
            var c = Convert.ToInt32(hex.Substring(inicio, 2), 16) / 255.0;
            return c <= 0.03928 ? c / 12.92 : Math.Pow((c + 0.055) / 1.055, 2.4);
        }
        var luminancia = 0.2126 * Canal(1) + 0.7152 * Canal(3) + 0.0722 * Canal(5);
        return 1.05 / (luminancia + 0.05);
    }
}
