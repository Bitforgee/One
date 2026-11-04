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

    [Fact]
    public void Teto_do_texto_700()
    {
        Assert.True(Conferencia.TextoDentroDoTeto(new string('a', 700)));
        Assert.False(Conferencia.TextoDentroDoTeto(new string('a', 701)));
        Assert.True(Conferencia.TextoDentroDoTeto("   " + new string('a', 700)));
        Assert.True(Conferencia.TextoDentroDoTeto(new string('a', 700) + "   "));
        Assert.False(Conferencia.TextoDentroDoTeto("   "));
        Assert.False(Conferencia.TextoDentroDoTeto(null));
    }

    [Theory]
    [InlineData("dia 10", "dia 10 de cada mês", true)]
    [InlineData("dia 30", "dia 10 de cada mês", false)]
    [InlineData("R$ 1.250,00", "R$ 1.250,00", true)]
    [InlineData("R$ 1.350,00", "R$ 1.250,00", false)]
    [InlineData("10/12/2026", "até 10/12/2026", true)]
    [InlineData("dia 05", "dia 5", true)]
    [InlineData("sem número nenhum", "dia 10", true)]
    [InlineData("R$ 10.250,00", "dia 10 e R$ 1.250,00", false)]
    [InlineData("dia ³⁰", "dia 30", false)]
    [InlineData("passo ①", "passo 1", false)]
    [InlineData("R$ 1.250,50", "R$ 1.250 e 50 centavos", false)]
    [InlineData("10/30", "dia 10 e 30 dias", false)]
    [InlineData("dia ３０", "dia 30", false)]
    public void Numeros_conferem(string texto, string fonte, bool esperado) =>
        Assert.Equal(esperado, Conferencia.NumerosConferem(texto, [fonte]));
}
