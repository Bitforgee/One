using One.Api.Assistente;

namespace One.Api.Tests;

public class ConferenciaTests
{
    [Fact]
    public void Normaliza_maiusculas_e_espacos()
    {
        Assert.True(Conferencia.TrechoConfere("PRAZO   de  pagamento", "Consulte o prazo de pagamento no portal."));
        Assert.True(Conferencia.TrechoConfere("o PRAZO de\npagamento no portal", "Consulte o prazo de pagamento no portal."));
    }

    [Fact]
    public void Acento_e_pontuacao_contam()
    {
        const string artigo = "Regra da casa: faltas não são abonadas em nenhum caso.";
        Assert.False(Conferencia.TrechoConfere("faltas nao sao abonadas", artigo));
        Assert.True(Conferencia.TrechoConfere("faltas não são abonadas", artigo));

        const string comVirgula = "Regra da casa: faltas não contam como presença.";
        Assert.False(Conferencia.TrechoConfere("Regra da casa: faltas, não contam", comVirgula));
        Assert.True(Conferencia.TrechoConfere("Regra da casa: faltas não contam", comVirgula));
    }

    [Fact]
    public void Trecho_de_20_a_400()
    {
        var artigo = string.Concat(Enumerable.Range(0, 60).Select(n => $"frase {n:00} do artigo. "));
        string Pedaco(int tamanho) => artigo[..tamanho];
        Assert.Equal(1200, artigo.Length);

        Assert.True(Conferencia.TrechoConfere(Pedaco(20), artigo));
        Assert.True(Conferencia.TrechoConfere(Pedaco(400), artigo));
        Assert.False(Conferencia.TrechoConfere(Pedaco(19), artigo));
        Assert.False(Conferencia.TrechoConfere(Pedaco(401), artigo));
    }
}
