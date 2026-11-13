using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace One.Api.Conhecimento;

public static class LeitorDePdf
{
    const long MaxPdf = 20 * 1024 * 1024;
    public const string SemTexto = "O PDF não tem texto. Exporte o documento com texto, não digitalizado.";

    public record Pdf(byte[] Conteudo, string Texto, int Paginas, string Nome);

    public static async Task<(Pdf?, IResult?)> Ler(IFormFile? arquivo)
    {
        if (arquivo is null) return (null, Problemas.Invalido("Envie o PDF no campo arquivo.", "arquivo"));
        var (lido, recusa) = await Arquivos.Ler(arquivo, MaxPdf, [Arquivos.Pdf], "O PDF passa de 20 MB.", "O arquivo não é PDF.");
        if (lido is null) return (null, recusa);
        try
        {
            using var doc = PdfDocument.Open(lido.Bytes);
            var texto = string.Join("\n\n", doc.GetPages().Select(p => ContentOrderTextExtractor.GetText(p))).Trim();
            if (texto.Length == 0) return (null, Problemas.Invalido(SemTexto, "arquivo"));
            return (new Pdf(lido.Bytes, texto, doc.NumberOfPages, lido.Nome), null);
        }
        catch (Exception e) when (e is not OutOfMemoryException)
        {
            return (null, Problemas.Invalido("Não foi possível ler o PDF.", "arquivo"));
        }
    }
}
