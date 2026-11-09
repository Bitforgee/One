using One.Api.Assistente;

namespace One.Api.Tests;

public class PerguntaTests
{
    static string DeTamanho(int tamanho) => new string('a', tamanho - 1) + "?";

    [Fact]
    public void Limites()
    {
        Assert.True(Pergunta.Aceita(DeTamanho(200), []));
        Assert.False(Pergunta.Aceita(DeTamanho(201), []));
        Assert.False(Pergunta.Aceita(new string('a', 200), []));
        Assert.True(Pergunta.Aceita("  " + DeTamanho(200) + "  ", []), "o texto vale aparado");
        Assert.False(Pergunta.Aceita("   ", []));
        Assert.False(Pergunta.Aceita(null, []));

        Assert.True(Pergunta.Aceita("Qual o seu curso?", [Tipos.Pergunta]), "2ª pergunta seguida");
        Assert.True(Pergunta.Aceita("Qual o seu curso?", [Tipos.Pergunta, Tipos.Resposta]), "2ª pergunta seguida, depois de uma resposta");
        Assert.False(Pergunta.Aceita("Qual o seu curso?", [Tipos.Pergunta, Tipos.Pergunta]), "3ª pergunta seguida");
    }

    [Fact]
    public void Pergunta_com_link_e_recusada()
    {
        Assert.False(Pergunta.Aceita("Acesse http://golpe.com para confirmar?", []));
        Assert.False(Pergunta.Aceita("Qual é o seu curso em https://univag.edu.br?", []));
        Assert.True(Pergunta.Aceita("Qual é o seu curso?", []));
    }
}
