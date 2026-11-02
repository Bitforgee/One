using One.Api.Dados;

namespace One.Api.Conhecimento;

public static class Fontes
{
    // RAG, AC 4: o trecho de um artigo é a versão inteira: título, perguntas e resposta
    public static string TextoDoArtigo(VersaoArtigo v) => $"{v.Titulo}\n{string.Join("\n", v.Perguntas)}\n{v.Resposta}";

    public static TrechoFonte DoArtigo(VersaoArtigo v, DateTime agora) =>
        new() { VersaoArtigo = v, Ordem = 0, Texto = TextoDoArtigo(v), ProximaTentativa = agora };
}
