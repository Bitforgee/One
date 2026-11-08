using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace One.Api.Conhecimento;

public static class DocumentoRotas
{
    const long MaxPdf = 20 * 1024 * 1024;
    public const string SemTexto = "O PDF não tem texto. Exporte o documento com texto, não digitalizado.";

    public static List<string> Dividir(string texto, int maximo = 1500, int sobreposicao = 200)
    {
        texto = texto.Replace("\r\n", "\n").Trim();
        var trechos = new List<string>();
        var inicio = 0;
        while (inicio < texto.Length)
        {
            if (texto.Length - inicio <= maximo) { trechos.Add(texto[inicio..]); break; }
            var janela = texto.Substring(inicio, maximo);
            var corte = janela.LastIndexOf("\n\n", StringComparison.Ordinal) is var p and > 0 && p + 2 > sobreposicao ? p + 2 : -1;
            if (corte < 0)
            {
                var frase = new[] { ". ", "! ", "? ", ".\n", "!\n", "?\n" }.Max(m => janela.LastIndexOf(m, StringComparison.Ordinal));
                corte = frase >= 0 && frase + 1 > sobreposicao ? frase + 1 : maximo;
            }
            trechos.Add(janela[..corte]);
            inicio += corte - sobreposicao;
        }
        return trechos;
    }

    public record Pdf(byte[] Conteudo, string Texto, int Paginas, string Nome);

    public static async Task<(Pdf?, IResult?)> LerPdf(IFormFile? arquivo)
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

    // A chave é sorteada aqui e o objeto só é gravado depois da decisão do domínio: um 409 não deixa objeto órfão.
    public static VersaoDocumento Versao(long instituicaoId, Pdf pdf, int numero, DateTime agora) =>
        new() { Numero = numero, NomeArquivo = pdf.Nome, Chave = Armazenamento.NovaChave(instituicaoId, "documentos"), Hash = Armazenamento.Hash(pdf.Conteudo), Tamanho = pdf.Conteudo.Length, Texto = pdf.Texto, Paginas = pdf.Paginas, CriadaEm = agora };

    public static void Trechos(OneDb db, VersaoDocumento v, DateTime agora) =>
        db.TrechosFonte.AddRange(Dividir(v.Texto).Select((t, i) => new TrechoFonte { VersaoDocumento = v, Ordem = i, Texto = t, ProximaTentativa = agora }));

    public static Task<Documento?> Ler(OneDb db, long id) =>
        db.Documentos.ComUltimaVersao().FirstOrDefaultAsync(d => d.Id == id);

    public static void MapearAdmin(RouteGroupBuilder admin)
    {
        ListarDocumentos.Mapear(admin);
        CriarDocumento.Mapear(admin);
        NovaVersaoDocumento.Mapear(admin);
        ArquivarDocumento.Mapear(admin);
    }

    public static void Mapear(RouteGroupBuilder api) => BaixarVersaoDocumento.Mapear(api);
}
