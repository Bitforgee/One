namespace One.Api;

public static class Arquivos
{
    public const string Pdf = "application/pdf";
    public const string Jpeg = "image/jpeg";
    public const string Png = "image/png";

    public record Lido(byte[] Bytes, string Tipo, string Nome);

    static string? TipoPelaAssinatura(byte[] b) => b switch
    {
        [0x25, 0x50, 0x44, 0x46, ..] => Pdf,
        [0xFF, 0xD8, 0xFF, ..] => Jpeg,
        [0x89, 0x50, 0x4E, 0x47, ..] => Png,
        _ => null,
    };

    public static async Task<(Lido?, IResult?)> Ler(IFormFile f, long maximo, string[] aceitos, string grandeDemais, string tipoRecusado)
    {
        if (f.Length > maximo) return (null, Problemas.Erro(413, grandeDemais));
        using var ms = new MemoryStream();
        await f.CopyToAsync(ms);
        var bytes = ms.ToArray();
        return TipoPelaAssinatura(bytes) is { } tipo && aceitos.Contains(tipo)
            ? (new Lido(bytes, tipo, Path.GetFileName(f.FileName)), null)
            : (null, Problemas.Erro(415, tipoRecusado));
    }
}
