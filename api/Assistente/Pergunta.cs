namespace One.Api.Assistente;

// Regra 5 do prompt (AC 23 do refatoracao-solid): pergunta curta, terminada em "?", nunca a terceira seguida do assistente.
public static class Pergunta
{
    public const int Maximo = 200;

    // ultimosTipos: tipos finais das mensagens anteriores do assistente, da mais nova para a mais velha.
    public static bool Aceita(string? texto, IReadOnlyList<string?> ultimosTipos)
    {
        var aparado = texto?.Trim() ?? "";
        var terceiraSeguida = ultimosTipos.Count >= 2 && ultimosTipos.Take(2).All(t => t == Tipos.Pergunta);
        return aparado.Length is > 0 and <= Maximo && aparado.EndsWith('?') && !terceiraSeguida;
    }
}
