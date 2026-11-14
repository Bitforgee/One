using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento.Artigos;

public static class ValidacaoDeArtigo
{
    public static async Task<IResult?> Validar(OneDb db, string? titulo, string[]? perguntas, long? categoriaId, string? resposta, string[]? links, DateOnly? visivelDe, DateOnly? visivelAte)
    {
        if (TituloEPerguntas(titulo, perguntas) is { } erro) return erro;
        if (!await db.Categorias.AnyAsync(c => c.Id == categoriaId)) return Problemas.Invalido("Escolha uma categoria.", "categoriaId");
        return RespostaLinksEValidade(resposta, links, visivelDe, visivelAte);
    }

    static IResult? TituloEPerguntas(string? titulo, string[]? perguntas)
    {
        if (!TituloDeConhecimento.Valido(titulo)) return Problemas.Invalido(TituloDeConhecimento.Recusa, "titulo");
        if (perguntas is null || !perguntas.Any(p => !string.IsNullOrWhiteSpace(p))) return Problemas.Invalido("Informe ao menos uma pergunta relacionada.", "perguntas");
        return null;
    }

    static IResult? RespostaLinksEValidade(string? resposta, string[]? links, DateOnly? visivelDe, DateOnly? visivelAte)
    {
        if (string.IsNullOrWhiteSpace(resposta) || resposta.Length > 8000) return Problemas.Invalido("Informe a resposta, com até 8000 caracteres.", "resposta");
        if ((links ?? []).Any(LinkInvalido))
            return Problemas.Invalido("Todo link deve começar com https:// ou http://.", "links");
        if (visivelDe > visivelAte) return Problemas.Invalido("O início da validade deve ser anterior ou igual ao fim.", "visivelDe");
        return null;
    }

    static bool LinkInvalido(string l) => !Uri.TryCreate(l, UriKind.Absolute, out var u) || u.Scheme is not ("http" or "https");

    public static VersaoArtigo Versao(string? titulo, string[]? perguntas, string? resposta, string[]? links, int numero, DateTime agora) =>
        VersaoArtigo.Criar(new(titulo!, perguntas!, resposta!, links), numero, agora);
}
