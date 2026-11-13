using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento.Shared;

public sealed record DocumentoResposta(long Id, string Titulo, long CategoriaId, string Categoria, string Estado, DocumentoResposta.DaVersao Versao, string Indexacao)
{
    public sealed record DaVersao(long Id, int Numero, string NomeArquivo, int Paginas, DateTime CriadaEm);

    record Trecho(bool Indexado, int Tentativas);

    public static async Task<DocumentoResposta> De(OneDb db, Documento d)
    {
        var v = d.UltimaVersao;
        var trechos = await db.TrechosFonte.Where(t => t.VersaoDocumentoId == v.Id).Select(t => new Trecho(t.Embedding != null, t.Tentativas)).ToListAsync();
        return new(d.Id, d.Titulo, d.CategoriaId, await db.Categorias.Where(c => c.Id == d.CategoriaId).Select(c => c.Nome).SingleAsync(), d.Estado,
            new(v.Id, v.Numero, v.NomeArquivo, v.Paginas, v.CriadaEm),
            trechos.All(t => t.Indexado) ? "INDEXADO" : trechos.Any(t => !t.Indexado && t.Tentativas >= 5) ? "FALHOU" : "PENDENTE");
    }
}
