using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

public record ArtigoIn(string? Titulo, string[]? Perguntas, long? CategoriaId, string? Resposta, string[]? Links, DateOnly? VisivelDe = null, DateOnly? VisivelAte = null);

// Os auxiliares que mais de um caso de uso de artigo usa.
public static class ArtigoRotas
{
    public static void Mapear(RouteGroupBuilder api) => VerVersaoArtigo.Mapear(api);

    public static object Saida(Artigo a, string categoria, Dictionary<long, string> indexacao)
    {
        var v = a.Ultima();
        return new
        {
            id = a.Id,
            estado = a.Estado,
            indexacao = indexacao.GetValueOrDefault(v.Id),
            categoriaId = a.CategoriaId,
            categoria,
            visivelDe = a.VisivelDe,
            visivelAte = a.VisivelAte,
            versao = new { id = v.Id, numero = v.Numero, titulo = v.Titulo, perguntas = v.Perguntas, resposta = v.Resposta, links = v.Links, criadaEm = v.CriadaEm },
        };
    }

    // AC 99 e 100: título, ao menos uma pergunta, categoria e resposta; links só http(s).
    public static async Task<IResult?> Validar(OneDb db, ArtigoIn i)
    {
        if (TituloEPerguntas(i) is { } erro) return erro;
        if (!await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId)) return Problemas.Invalido("Escolha uma categoria.", "categoriaId");
        return RespostaLinksEValidade(i);
    }

    static IResult? TituloEPerguntas(ArtigoIn i)
    {
        if (string.IsNullOrWhiteSpace(i.Titulo) || i.Titulo.Length > 200) return Problemas.Invalido("Informe o título, com até 200 caracteres.", "titulo");
        if (i.Perguntas is null || !i.Perguntas.Any(p => !string.IsNullOrWhiteSpace(p))) return Problemas.Invalido("Informe ao menos uma pergunta relacionada.", "perguntas");
        return null;
    }

    static IResult? RespostaLinksEValidade(ArtigoIn i)
    {
        if (string.IsNullOrWhiteSpace(i.Resposta) || i.Resposta.Length > 8000) return Problemas.Invalido("Informe a resposta, com até 8000 caracteres.", "resposta");
        if ((i.Links ?? []).Any(LinkInvalido))
            return Problemas.Invalido("Todo link deve começar com https:// ou http://.", "links");
        if (i.VisivelDe > i.VisivelAte) return Problemas.Invalido("O início da validade deve ser anterior ou igual ao fim.", "visivelDe"); // AC 150
        return null;
    }

    static bool LinkInvalido(string l) => !Uri.TryCreate(l, UriKind.Absolute, out var u) || u.Scheme is not ("http" or "https");

    public static VersaoArtigo Versao(ArtigoIn i, int numero, DateTime agora) => new()
    {
        Numero = numero,
        Titulo = i.Titulo!,
        Perguntas = i.Perguntas!.Where(p => !string.IsNullOrWhiteSpace(p)).ToList(),
        Resposta = i.Resposta!,
        Links = [.. i.Links ?? []],
        CriadaEm = agora,
    };

    public static Task<Artigo?> Ler(OneDb db, long id) => db.Artigos.Include(a => a.Versoes).FirstOrDefaultAsync(a => a.Id == id);

    public static async Task<IResult> Responder(OneDb db, Artigo a, int status = 200)
    {
        var atual = a.Versoes.Max(v => v.Id);
        var corpo = Saida(a, await db.Categorias.Where(c => c.Id == a.CategoriaId).Select(c => c.Nome).SingleAsync(), await Fontes.Indexacao(db, [atual]));
        return status == 201 ? Results.Created($"/api/admin/artigos/{a.Id}", corpo) : Results.Ok(corpo);
    }

    // S7: o administrador escreve, versiona, ativa e arquiva; nada é apagado (versões append-only, door 6).
    public static void MapearAdmin(RouteGroupBuilder admin)
    {
        ListarArtigos.Mapear(admin);
        CriarArtigo.Mapear(admin);
        AlterarArtigo.Mapear(admin);
        AtivarArtigo.Mapear(admin);
        ArquivarArtigo.Mapear(admin);
    }
}
