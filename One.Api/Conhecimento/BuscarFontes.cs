using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace One.Api.Conhecimento;

public record Fonte(long Id, string Titulo, string Texto, List<string> Links, double Distancia, long? ArtigoId);

public static class BuscarFontes
{
    public static IQueryable<Documento> ComUltimaVersao(this IQueryable<Documento> documentos) =>
        documentos.Include(d => d.Versoes.OrderByDescending(v => v.Numero).Take(1));

    public static IQueryable<VersaoArtigo> VersoesAtuais(this OneDb db) =>
        db.VersoesArtigo.Where(v => v.Numero == db.VersoesArtigo.Where(x => x.ArtigoId == v.ArtigoId).Max(x => x.Numero));

    public static IQueryable<VersaoDocumento> VersoesDocumentoAtuais(this OneDb db) =>
        db.VersoesDocumento.Where(v => v.Numero == db.VersoesDocumento.Where(x => x.DocumentoId == v.DocumentoId).Max(x => x.Numero));

    public static async Task<Dictionary<long, string>> Indexacao(OneDb db, List<long> versoes) =>
        (await db.TrechosFonte.Where(t => t.VersaoArtigoId != null && versoes.Contains(t.VersaoArtigoId.Value))
            .Select(t => new { Versao = t.VersaoArtigoId!.Value, Indexado = t.Embedding != null, t.Tentativas }).ToListAsync())
        .ToDictionary(t => t.Versao, t => t.Indexado ? "INDEXADO" : t.Tentativas >= 5 ? "FALHOU" : "PENDENTE");

    static IQueryable<long?> ArtigosBuscaveis(OneDb db, DateOnly hoje) =>
        db.VersoesAtuais().Where(v => v.Artigo!.Estado == EstadosArtigo.Ativo
                && (v.Artigo.VisivelDe == null || v.Artigo.VisivelDe <= hoje)
                && (v.Artigo.VisivelAte == null || v.Artigo.VisivelAte >= hoje))
            .Select(v => (long?)v.Id);

    static IQueryable<long?> DocumentosBuscaveis(OneDb db) =>
        db.VersoesDocumentoAtuais().Where(v => v.Documento!.Estado == EstadosDocumento.Ativo).Select(v => (long?)v.Id);

    public static async Task<List<Fonte>> Buscar(OneDb db, float[] vetor, DateOnly hoje, int k)
    {
        var consulta = new Vector(vetor);
        var (artigos, documentos) = (ArtigosBuscaveis(db, hoje), DocumentosBuscaveis(db));
        var achados = await db.TrechosFonte
            .Where(t => t.Embedding != null && (artigos.Contains(t.VersaoArtigoId) || documentos.Contains(t.VersaoDocumentoId)))
            .OrderBy(t => t.Embedding!.CosineDistance(consulta)).ThenBy(t => t.Id)
            .Take(k)
            .Select(t => new
            {
                t.Id,
                t.Texto,
                Distancia = t.Embedding!.CosineDistance(consulta),
                Titulo = t.VersaoArtigoId != null ? t.VersaoArtigo!.Titulo : t.VersaoDocumento!.Documento!.Titulo,
                t.VersaoArtigoId,
                ArtigoId = t.VersaoArtigoId != null ? t.VersaoArtigo!.ArtigoId : (long?)null,
            }).ToListAsync();
        var idsArtigo = achados.Where(a => a.VersaoArtigoId != null).Select(a => a.VersaoArtigoId!.Value).ToList();
        var links = await db.VersoesArtigo.Where(v => idsArtigo.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Links);
        return achados.Select(a => new Fonte(a.Id, a.Titulo, a.Texto, a.VersaoArtigoId is { } v ? links[v] : [], a.Distancia, a.ArtigoId)).ToList();
    }

    public class CategoriaCitada
    {
        public long CitacaoId { get; init; }
        public long MensagemConversaId { get; init; }
        public long CategoriaId { get; init; }
    }

    public static IQueryable<CategoriaCitada> CategoriasCitadas(this OneDb db) =>
        db.Citacoes.Select(ci => new CategoriaCitada
        {
            CitacaoId = ci.Id,
            MensagemConversaId = ci.MensagemConversaId,
            CategoriaId = ci.TrechoFonteId != null
                ? db.TrechosFonte.Where(t => t.Id == ci.TrechoFonteId)
                    .Select(t => t.VersaoArtigoId != null ? t.VersaoArtigo!.Artigo!.CategoriaId : t.VersaoDocumento!.Documento!.CategoriaId).First()
                : db.VersoesArtigo.Where(v => v.Id == ci.VersaoArtigoId).Select(v => v.Artigo!.CategoriaId).First(),
        });
}
