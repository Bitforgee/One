using One.Api.Dados;
using One.Api.Dados.Cadastros;

namespace One.Api.Tests;

public class RespostaProntaDominioTests
{
    [Theory]
    [InlineData("", "texto", "Informe o título.")]
    [InlineData(null, "texto", "Informe o título.")]
    [InlineData("Título", "", "O texto deve ter de 1 a 4000 caracteres.")]
    [InlineData("Título", null, "O texto deve ter de 1 a 4000 caracteres.")]
    public void Validar_cada_regra_pura(string? titulo, string? texto, string motivo)
    {
        Assert.Equal(new Invalido(motivo), RespostaPronta.Validar(titulo, texto));
    }

    [Fact]
    public void Validar_limita_titulo_a_200_e_texto_a_4000()
    {
        Assert.Null(RespostaPronta.Validar(new string('a', 200), new string('b', 4000)));
        Assert.Equal(new Invalido("Informe o título."), RespostaPronta.Validar(new string('a', 201), "texto"));
        Assert.Equal(new Invalido("O texto deve ter de 1 a 4000 caracteres."), RespostaPronta.Validar("Título", new string('b', 4001)));
    }
}
