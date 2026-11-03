using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace One.Api.Conhecimento;

// RAG S3, door R4: PDFs da instituição como fonte interna do assistente; nunca aparecem para o aluno (AD-012).
// Os auxiliares que mais de um caso de uso de documento usa.
public static class DocumentoRotas
{
    const long MaxPdf = 20 * 1024 * 1024;
    public const string SemTexto = "O PDF não tem texto. Exporte o documento com texto, não digitalizado.";

    // RAG, AC 17: trechos de até 1500 caracteres, cortados no fim de parágrafo (se houver um antes do limite) ou de frase,
    // e o seguinte começa repetindo os últimos 200 caracteres do anterior.
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

    // AC 18: 413 acima de 20 MB, 415 sem a assinatura %PDF, 400 sem texto extraível
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

    public static VersaoDocumento Versao(Pdf pdf, int numero, DateTime agora) =>
        new() { Numero = numero, NomeArquivo = pdf.Nome, Conteudo = pdf.Conteudo, Texto = pdf.Texto, Paginas = pdf.Paginas, CriadaEm = agora };

    // AC 16: os trechos pendentes entram na mesma transação; o agendador gera os embeddings
    public static void Trechos(OneDb db, VersaoDocumento v, DateTime agora) =>
        db.TrechosFonte.AddRange(Dividir(v.Texto).Select((t, i) => new TrechoFonte { VersaoDocumento = v, Ordem = i, Texto = t, ProximaTentativa = agora }));

    public static Task<Documento?> Ler(OneDb db, long id) =>
        db.Documentos.ComUltimaVersao().FirstOrDefaultAsync(d => d.Id == id);

    public static void MapearAdmin(RouteGroupBuilder admin)
    {
        ListarDocumentos.Mapear(admin);
        CriarDocumento.Mapear(admin);
        // AC 19 e AC 20: versão nova só em documento ATIVO; as anteriores ficam guardadas
        NovaVersaoDocumento.Mapear(admin);
        ArquivarDocumento.Mapear(admin);
    }

    // AC 21 e AC 22: só atendente e administrador baixam a versão citada; para os demais ela "não existe"
    public static void Mapear(RouteGroupBuilder api) => BaixarVersaoDocumento.Mapear(api);
}
