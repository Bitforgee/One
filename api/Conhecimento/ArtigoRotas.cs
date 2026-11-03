using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento;

// Os auxiliares que mais de um caso de uso de artigo usa.
public static class ArtigoRotas
{
    public static void Mapear(RouteGroupBuilder api) => VerVersaoArtigo.Mapear(api);

    // AC 99 e 100: título, ao menos uma pergunta, categoria e resposta; links só http(s).
    public static async Task<IResult?> Validar(OneDb db, string? titulo, string[]? perguntas, long? categoriaId, string? resposta, string[]? links, DateOnly? visivelDe, DateOnly? visivelAte)
    {
        if (TituloEPerguntas(titulo, perguntas) is { } erro) return erro;
        if (!await db.Categorias.AnyAsync(c => c.Id == categoriaId)) return Problemas.Invalido("Escolha uma categoria.", "categoriaId");
        return RespostaLinksEValidade(resposta, links, visivelDe, visivelAte);
    }

    static IResult? TituloEPerguntas(string? titulo, string[]? perguntas)
    {
        if (string.IsNullOrWhiteSpace(titulo) || titulo.Length > 200) return Problemas.Invalido("Informe o título, com até 200 caracteres.", "titulo");
        if (perguntas is null || !perguntas.Any(p => !string.IsNullOrWhiteSpace(p))) return Problemas.Invalido("Informe ao menos uma pergunta relacionada.", "perguntas");
        return null;
    }

    static IResult? RespostaLinksEValidade(string? resposta, string[]? links, DateOnly? visivelDe, DateOnly? visivelAte)
    {
        if (string.IsNullOrWhiteSpace(resposta) || resposta.Length > 8000) return Problemas.Invalido("Informe a resposta, com até 8000 caracteres.", "resposta");
        if ((links ?? []).Any(LinkInvalido))
            return Problemas.Invalido("Todo link deve começar com https:// ou http://.", "links");
        if (visivelDe > visivelAte) return Problemas.Invalido("O início da validade deve ser anterior ou igual ao fim.", "visivelDe"); // AC 150
        return null;
    }

    static bool LinkInvalido(string l) => !Uri.TryCreate(l, UriKind.Absolute, out var u) || u.Scheme is not ("http" or "https");

    public static VersaoArtigo Versao(string? titulo, string[]? perguntas, string? resposta, string[]? links, int numero, DateTime agora) => new()
    {
        Numero = numero,
        Titulo = titulo!,
        Perguntas = perguntas!.Where(p => !string.IsNullOrWhiteSpace(p)).ToList(),
        Resposta = resposta!,
        Links = [.. links ?? []],
        CriadaEm = agora,
    };

    public static Task<Artigo?> Ler(OneDb db, long id) => db.Artigos.Include(a => a.Versoes).FirstOrDefaultAsync(a => a.Id == id);

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
