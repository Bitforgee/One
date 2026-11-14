using One.Api.Assistente.Busca;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Dados.Conversas;

namespace One.Api.Assistente.Respostas;

public static class ConferirResposta
{
    public static (string, string?, List<CitacaoArtigo>) Classificar(SaidaModelo saida, List<Fonte> fontes, Conversa conversa)
    {
        switch (saida.Tipo)
        {
            case Tipos.Resposta:
                var (citacoes, motivo) = Conferir(saida, fontes);
                return (motivo is null ? Tipos.Resposta : Tipos.SemBase, motivo, citacoes);
            case Tipos.Pergunta:
                var ultimas = conversa.Mensagens.Where(m => m.Autor == MensagemConversa.AutorAssistente).OrderByDescending(m => m.Id).Take(2).Select(m => m.TipoFinal).ToList();
                return Pergunta.Aceita(saida.Texto, ultimas) ? (Tipos.Pergunta, null, []) : (Tipos.SemBase, "pergunta_invalida", []);
            case Tipos.Transferir:
                return (Tipos.Transferir, null, []);
            default:
                return (Tipos.SemBase, null, []);
        }
    }

    public static (List<CitacaoArtigo>, string?) Conferir(SaidaModelo saida, List<Fonte> buscadas)
    {
        var ids = saida.FonteIds?.Distinct().ToList() ?? [];
        var citadas = ids.Select(id => buscadas.FirstOrDefault(f => f.Id == id)).ToList();
        if (ids.Count == 0 || citadas.Any(f => f is null)) return ([], "fonte_invalida");
        if (MotivoDoTexto(saida.Texto) is { } doTexto) return ([], doTexto);

        var trechos = saida.Trechos ?? [];
        if (!TrechosConferem(trechos, citadas!)) return ([], "trecho_invalido");
        if (!Conferencia.LinksConferem(saida.Texto!, citadas.SelectMany(f => f!.Links))) return ([], "link_invalido");
        if (!Conferencia.NumerosConferem(saida.Texto!, citadas.Select(f => f!.Texto))) return ([], "numero_sem_fonte");

        return (citadas.Select(f => CitacaoArtigo.DoTrecho(f!.Id, trechos.Where(t => t.FonteId == f.Id).Select(t => t.Texto!).ToList())).ToList(), null);
    }

    public static string TextoFinal(string tipoFinal, SaidaModelo? saida) => tipoFinal switch
    {
        Tipos.Resposta => saida!.Texto!,
        Tipos.Pergunta => saida!.Texto!.Trim(),
        Tipos.Transferir => Textos.Transferir,
        _ => Textos.SemBase,
    };

    public static string ArtigosCitados(SaidaModelo? saida, List<Fonte> fontes) =>
        string.Join(",", (saida?.FonteIds ?? []).Select(id => fontes.FirstOrDefault(f => f.Id == id)?.ArtigoId).OfType<long>());

    static string? MotivoDoTexto(string? texto) =>
        string.IsNullOrWhiteSpace(texto) ? "texto_vazio" : Conferencia.TextoDentroDoTeto(texto) ? null : "texto_longo";

    static bool TrechosConferem(List<Trecho> trechos, List<Fonte> citadas) =>
        trechos.All(t => citadas.FirstOrDefault(f => f.Id == t.FonteId) is { } f && Conferencia.TrechoConfere(t.Texto, f.Texto))
            && citadas.All(f => trechos.Any(t => t.FonteId == f.Id));
}
