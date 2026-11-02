using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace One.Api.Conhecimento;

// Trecho de fonte devolvido pela busca, com o que o modelo e a conferência precisam (door R3).
public record Fonte(long Id, string Titulo, string Texto, List<string> Links, double Distancia, long? ArtigoId);

// Dono único de "última versão" e de "artigo ou documento" das fontes do assistente: busca, citação,
// categoria da fonte citada e indexação passam por aqui.
public static class Fontes
{
    // RAG, AC 4: o trecho de um artigo é a versão inteira: título, perguntas e resposta
    public static string TextoDoArtigo(VersaoArtigo v) => $"{v.Titulo}\n{string.Join("\n", v.Perguntas)}\n{v.Resposta}";

    public static TrechoFonte DoArtigo(VersaoArtigo v, DateTime agora) =>
        new() { VersaoArtigo = v, Ordem = 0, Texto = TextoDoArtigo(v), ProximaTentativa = agora };

    // Última versão: a de maior número.
    public static VersaoArtigo Ultima(this Artigo a) => a.Versoes.OrderByDescending(v => v.Numero).First();

    public static VersaoDocumento Ultima(this Documento d) => d.Versoes.OrderByDescending(v => v.Numero).First();

    public static IQueryable<Documento> ComUltimaVersao(this IQueryable<Documento> documentos) =>
        documentos.Include(d => d.Versoes.OrderByDescending(v => v.Numero).Take(1));

    public static IQueryable<VersaoArtigo> VersoesAtuais(this OneDb db) =>
        db.VersoesArtigo.Where(v => v.Numero == db.VersoesArtigo.Where(x => x.ArtigoId == v.ArtigoId).Max(x => x.Numero));

    public static IQueryable<VersaoDocumento> VersoesDocumentoAtuais(this OneDb db) =>
        db.VersoesDocumento.Where(v => v.Numero == db.VersoesDocumento.Where(x => x.DocumentoId == v.DocumentoId).Max(x => x.Numero));

    // RAG, AC 6 e Surface: estado da indexação do trecho da versão de artigo; nulo quando ela nunca foi ativada
    public static async Task<Dictionary<long, string>> Indexacao(OneDb db, List<long> versoes) =>
        (await db.TrechosFonte.Where(t => t.VersaoArtigoId != null && versoes.Contains(t.VersaoArtigoId.Value))
            .Select(t => new { Versao = t.VersaoArtigoId!.Value, Indexado = t.Embedding != null, t.Tentativas }).ToListAsync())
        .ToDictionary(t => t.Versao, t => t.Indexado ? "INDEXADO" : t.Tentativas >= 5 ? "FALHOU" : "PENDENTE");

    // RAG, AC 8 e AC 150: artigo ativo, na validade de hoje, na versão atual
    static IQueryable<long?> ArtigosBuscaveis(OneDb db, DateOnly hoje) =>
        db.VersoesAtuais().Where(v => v.Artigo!.Estado == EstadosArtigo.Ativo
                && (v.Artigo.VisivelDe == null || v.Artigo.VisivelDe <= hoje)
                && (v.Artigo.VisivelAte == null || v.Artigo.VisivelAte >= hoje))
            .Select(v => (long?)v.Id);

    static IQueryable<long?> DocumentosBuscaveis(OneDb db) =>
        db.VersoesDocumentoAtuais().Where(v => v.Documento!.Estado == EstadosDocumento.Ativo).Select(v => (long?)v.Id);

    // RAG, AC 7 e AC 8: os k trechos mais próximos da consulta, só de fontes buscáveis (door 16: o filtro global limita à instituição)
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

    public record FonteCitada(string Tipo, long? VersaoArtigoId, long? VersaoDocumentoId, string Titulo, int Numero, List<string> Trechos, bool Atualizado);

    record VersaoCitada(string Titulo, int Numero, long Atual);

    // AC 73 a 75 e RAG: a fonte de cada citação, como a equipe a vê no detalhe do chamado. A citação nova aponta para o trecho
    // de fonte (artigo ou documento); as anteriores ao RAG, para a versão de artigo. "Atualizado" quando a fonte ativa tem versão nova.
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

    public class CategoriaCitada
    {
        public long CitacaoId { get; init; }
        public long MensagemConversaId { get; init; }
        public long CategoriaId { get; init; }
    }

    // Categoria da fonte de cada citação: a do artigo ou a do documento do trecho citado, ou a do artigo das citações anteriores ao RAG.
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
