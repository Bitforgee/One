using One.Api.Dados;
using One.Api.Dados.Cadastros;

namespace One.Api.Tests;

public class CategoriaDominioTests
{
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Validar_nome_vazio_devolve_Invalido(string? nome)
    {
        Assert.Equal(new Invalido("Informe o nome da categoria."), Categoria.Validar(nome, true));
    }

    [Fact]
    public void Validar_limita_o_nome_a_100_caracteres()
    {
        Assert.Null(Categoria.Validar(new string('a', 100), true));
        Assert.Equal(new Invalido("Informe o nome da categoria."), Categoria.Validar(new string('a', 101), true));
    }

    [Fact]
    public void Validar_padrao_nao_renomeia_nem_desativa()
    {
        var padrao = Categoria.CriarPadrao();
        var motivo = new Invalido("A categoria \"Não classificado\" não pode ser renomeada nem desativada.");
        Assert.Equal(motivo, Categoria.Validar("Outro nome", true, padrao));
        Assert.Equal(motivo, Categoria.Validar("Não classificado", false, padrao));
        Assert.Null(Categoria.Validar("Não classificado", true, padrao));
        Assert.Null(Categoria.Validar("Outro nome", false, Categoria.Criar("Boletos")));
    }
}
