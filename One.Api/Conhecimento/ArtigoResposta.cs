using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public sealed record ArtigoResposta(long Id, string Estado, string? Indexacao, long CategoriaId, string Categoria, DateOnly? VisivelDe, DateOnly? VisivelAte, ArtigoResposta.DaVersao Versao)
{
    public sealed record DaVersao(long Id, int Numero, string Titulo, IReadOnlyList<string> Perguntas, string Resposta, IReadOnlyList<string> Links, DateTime CriadaEm);

    public static ArtigoResposta De(Artigo a, string categoria, Dictionary<long, string> indexacao)
    {
        var v = a.UltimaVersao;
        return new(a.Id, a.Estado, indexacao.GetValueOrDefault(v.Id), a.CategoriaId, categoria, a.VisivelDe, a.VisivelAte,
            new(v.Id, v.Numero, v.Titulo, v.Perguntas, v.Resposta, v.Links, v.CriadaEm));
    }

    public static async Task<ArtigoResposta> De(OneDb db, Artigo a) =>
        De(a, await db.Categorias.Where(c => c.Id == a.CategoriaId).Select(c => c.Nome).SingleAsync(), await BuscarFontes.Indexacao(db, [a.Versoes.Max(v => v.Id)]));
}
