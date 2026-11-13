namespace One.Api.Tests;

public class CpfValorTests
{
    [Fact]
    public void Tentar_cpf_valido_normaliza_e_mascara()
    {
        var comPontuacao = Cpf.Tentar("111.444.777-35");
        var semPontuacao = Cpf.Tentar("11144477735");

        Assert.NotNull(comPontuacao);
        Assert.Equal(("11144477735", "***.444.777-**"), (comPontuacao.Valor, comPontuacao.Mascarado));
        Assert.Equal("11144477735", semPontuacao?.Valor);
        Assert.Equal("11144477735", comPontuacao.ToString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("1114447773")]
    [InlineData("111.444.7a7-35")]
    [InlineData("111.444.777-45")]
    [InlineData("111.444.777-36")]
    public void Tentar_devolve_null_nos_cinco_casos_invalidos(string? texto) => Assert.Null(Cpf.Tentar(texto));
}