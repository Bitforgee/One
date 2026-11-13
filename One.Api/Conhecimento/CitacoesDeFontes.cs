using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public static class CitacoesDeFontes
{
    public record FonteCitada(string Tipo, long? VersaoArtigoId, long? VersaoDocumentoId, string Titulo, int Numero, List<string> Trechos, bool Atualizado);

    record VersaoCitada(string Titulo, int Numero, long Atual);

    public static async Task<Func<CitacaoArtigo, FonteCitada>> Citadas(OneDb db, List<CitacaoArtigo> citacoes)
    {
        var idsTrecho = citacoes.Where(x => x.TrechoFonteId != null).Select(x => x.TrechoFonteId!.Value).Distinct().ToList();
        var trechos = await db.TrechosFonte.Where(t => idsTrecho.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => (t.VersaoArtigoId, t.VersaoDocumentoId));
        long? VersaoArtigo(CitacaoArtigo x) => x.TrechoFonteId is { } t ? trechos[t].VersaoArtigoId : x.VersaoArtigoId;
        long? VersaoDocumento(CitacaoArtigo x) => x.TrechoFonteId is { } t ? trechos[t].VersaoDocumentoId : null;
        var artigos = await VersoesDeArtigo(db, citacoes.Select(VersaoArtigo).OfType<long>().Distinct().ToList());
        var documentos = await VersoesDeDocumento(db, citacoes.Select(VersaoDocumento).OfType<long>().Distinct().ToList());
        return x => VersaoDocumento(x) is { } d
            ? new FonteCitada("DOCUMENTO", null, d, documentos[d].Titulo, documentos[d].Numero, x.Trechos, documentos[d].Atual != d)
            : Artigo(VersaoArtigo(x)!.Value, artigos, x.Trechos);
    }

    static FonteCitada Artigo(long v, Dictionary<long, VersaoCitada> artigos, List<string> trechos) =>
        new("ARTIGO", v, null, artigos[v].Titulo, artigos[v].Numero, trechos, artigos[v].Atual != v);

    static Task<Dictionary<long, VersaoCitada>> VersoesDeArtigo(OneDb db, List<long> ids)
    {
        var atuais = db.VersoesAtuais();
        return db.VersoesArtigo.Where(v => ids.Contains(v.Id))
            .Select(v => new
            {
                v.Id,
                v.Titulo,
                v.Numero,
                Atual = v.Artigo!.Estado == EstadosArtigo.Ativo ? atuais.Where(x => x.ArtigoId == v.ArtigoId).Select(x => x.Id).First() : v.Id,
            }).ToDictionaryAsync(v => v.Id, v => new VersaoCitada(v.Titulo, v.Numero, v.Atual));
    }

    static Task<Dictionary<long, VersaoCitada>> VersoesDeDocumento(OneDb db, List<long> ids)
    {
        var atuais = db.VersoesDocumentoAtuais();
        return db.VersoesDocumento.Where(v => ids.Contains(v.Id))
            .Select(v => new
            {
                v.Id,
                v.Documento!.Titulo,
                v.Numero,
                Atual = v.Documento.Estado == EstadosDocumento.Ativo ? atuais.Where(x => x.DocumentoId == v.DocumentoId).Select(x => x.Id).First() : v.Id,
            }).ToDictionaryAsync(v => v.Id, v => new VersaoCitada(v.Titulo, v.Numero, v.Atual));
    }
}
