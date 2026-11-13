using One.Api.Dados.Conversas;

namespace One.Api.Assistente;

public static class Pergunta
{
    public const int Maximo = 200;

    public static bool Aceita(string? texto, IReadOnlyList<string?> ultimosTipos)
    {
        var aparado = texto?.Trim() ?? "";
        var terceiraSeguida = ultimosTipos.Count >= 2 && ultimosTipos.Take(2).All(t => t == Tipos.Pergunta);
        return aparado.Length is > 0 and <= Maximo && aparado.EndsWith('?') && !terceiraSeguida && !Conferencia.TemLink(aparado);
    }
}
