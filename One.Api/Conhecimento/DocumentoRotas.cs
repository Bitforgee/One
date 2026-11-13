using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public static class DocumentoRotas
{
    public static VersaoDocumento Versao(long instituicaoId, LeitorDePdf.Pdf pdf, int numero, DateTime agora) =>
        VersaoDocumento.Criar(new(pdf.Nome, Armazenamento.NovaChave(instituicaoId, "documentos"), Armazenamento.Hash(pdf.Conteudo), pdf.Conteudo.Length), pdf.Texto, pdf.Paginas, numero, agora);

    public static void Trechos(OneDb db, VersaoDocumento v, DateTime agora) =>
        db.TrechosFonte.AddRange(DivisorDeTexto.Dividir(v.Texto).Select((t, i) => TrechoFonte.DoDocumento(v, i, t, agora)));

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
