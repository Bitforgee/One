using One.Api.Assistente.Busca;
using One.Api.Assistente.Respostas;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Dados.Conversas;

namespace One.Api.Tests;

public class ConferirRespostaTests
{
    static readonly DateTime Agora = new(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc);
    const string TextoDaFonte = "O boleto da segunda via fica disponível no Portal do Aluno, na aba Financeiro, em até 5 dias.";
    const string TrechoDaFonte = "boleto da segunda via fica disponível no Portal do Aluno";

    static readonly List<Fonte> Fontes = [new(12, "Segunda via", TextoDaFonte, [], 0.1, 7)];

    static SaidaModelo Saida(string tipo, string? texto = "A segunda via do boleto fica no Portal do Aluno.", List<long>? fonteIds = null, List<Trecho>? trechos = null) =>
        new(tipo, texto, fonteIds ?? [12], trechos ?? [new Trecho(12, TrechoDaFonte)], null, null);

    static Conversa ConversaComPerguntasSeguidas(int perguntas)
    {
        var conversa = Conversa.Iniciar(1, Agora);
        for (var n = 0; n < perguntas; n++)
            conversa.Registrar(MensagemConversa.DoAssistente(new() { Texto = "Qual curso?", TipoFinal = Tipos.Pergunta, CriadaEm = Agora }));
        return conversa;
    }

    [Fact]
    public void Classificar_cada_tipo()
    {
        var conversa = ConversaComPerguntasSeguidas(0);

        var (tipo, motivo, citacoes) = ConferirResposta.Classificar(Saida(Tipos.Resposta), Fontes, conversa);
        Assert.Equal((Tipos.Resposta, null), (tipo, motivo));
        Assert.Equal([12L], citacoes.Select(c => c.TrechoFonteId!.Value));

        (tipo, motivo, citacoes) = ConferirResposta.Classificar(Saida(Tipos.Resposta, fonteIds: [99]), Fontes, conversa);
        Assert.Equal((Tipos.SemBase, "fonte_invalida"), (tipo, motivo));
        Assert.Empty(citacoes);

        (tipo, motivo, _) = ConferirResposta.Classificar(Saida(Tipos.Pergunta, "Qual é o seu curso?"), Fontes, conversa);
        Assert.Equal((Tipos.Pergunta, null), (tipo, motivo));

        (tipo, motivo, _) = ConferirResposta.Classificar(Saida(Tipos.Pergunta, "Qual é o seu curso?"), Fontes, ConversaComPerguntasSeguidas(2));
        Assert.Equal((Tipos.SemBase, "pergunta_invalida"), (tipo, motivo));

        (tipo, motivo, _) = ConferirResposta.Classificar(Saida(Tipos.Transferir), Fontes, conversa);
        Assert.Equal((Tipos.Transferir, null), (tipo, motivo));

        (tipo, motivo, _) = ConferirResposta.Classificar(Saida("outro"), Fontes, conversa);
        Assert.Equal((Tipos.SemBase, null), (tipo, motivo));
    }

    [Fact]
    public void Conferir_cada_motivo()
    {
        Assert.Equal("fonte_invalida", ConferirResposta.Conferir(Saida(Tipos.Resposta, fonteIds: []), Fontes).Item2);
        Assert.Equal("fonte_invalida", ConferirResposta.Conferir(Saida(Tipos.Resposta, fonteIds: [99]), Fontes).Item2);
        Assert.Equal("texto_vazio", ConferirResposta.Conferir(Saida(Tipos.Resposta, "   "), Fontes).Item2);
        Assert.Equal("texto_longo", ConferirResposta.Conferir(Saida(Tipos.Resposta, new string('a', 701)), Fontes).Item2);
        Assert.Equal("trecho_invalido", ConferirResposta.Conferir(Saida(Tipos.Resposta, trechos: [new Trecho(12, "um trecho que a fonte não tem de jeito nenhum")]), Fontes).Item2);
        Assert.Equal("link_invalido", ConferirResposta.Conferir(Saida(Tipos.Resposta, "Veja em: https://outro.exemplo/boleto"), Fontes).Item2);
        Assert.Equal("numero_sem_fonte", ConferirResposta.Conferir(Saida(Tipos.Resposta, "O boleto sai em 30 dias."), Fontes).Item2);

        var (citacoes, motivo) = ConferirResposta.Conferir(Saida(Tipos.Resposta), Fontes);
        Assert.Null(motivo);
        var citacao = Assert.Single(citacoes);
        Assert.Equal(12, citacao.TrechoFonteId);
        Assert.Equal([TrechoDaFonte], citacao.Trechos);
    }
}
