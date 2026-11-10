namespace One.Api.Tests;

public class TokenMcpDominioTests
{
    static readonly DateTime Agora = new(2026, 11, 10, 12, 0, 0, DateTimeKind.Utc);

    static TokenMcp Novo(int dias = 30) => TokenMcp.Criar(7, "Cursor", new string('a', 64), "wxyz", Agora, dias);

    [Fact]
    public void Estado_na_fronteira_do_vencimento()
    {
        var t = Novo(30);
        var vence = Agora.AddDays(30);

        Assert.Equal(vence, t.ExpiraEm);
        Assert.Equal(TokenMcp.Estados.Ativo, t.Estado(Agora));
        Assert.Equal(TokenMcp.Estados.Ativo, t.Estado(vence.AddTicks(-1)));
        Assert.Equal(TokenMcp.Estados.Expirado, t.Estado(vence));
        Assert.Equal(TokenMcp.Estados.Expirado, t.Estado(vence.AddDays(1)));
    }

    [Fact]
    public void Revogacao_vence_o_vencimento()
    {
        var antes = Novo(30);
        antes.Revogar(Agora.AddDays(1));
        Assert.Equal(TokenMcp.Estados.Revogado, antes.Estado(Agora.AddDays(2)));

        var depois = Novo(30);
        depois.Revogar(Agora.AddDays(40));
        Assert.Equal(TokenMcp.Estados.Revogado, depois.Estado(Agora.AddDays(41)));
    }

    [Fact]
    public void Revogar_duas_vezes_mantem_a_primeira_data()
    {
        var t = Novo();
        t.Revogar(Agora.AddHours(1));
        t.Revogar(Agora.AddHours(5));

        Assert.Equal(Agora.AddHours(1), t.RevogadoEm);
    }

    [Fact]
    public void Registrar_uso_so_depois_de_um_minuto()
    {
        var t = Novo();

        Assert.True(t.RegistrarUso(Agora));
        Assert.False(t.RegistrarUso(Agora.AddSeconds(59)));
        Assert.Equal(Agora, t.UltimoUsoEm);
        Assert.True(t.RegistrarUso(Agora.AddSeconds(60)));
        Assert.Equal(Agora.AddSeconds(60), t.UltimoUsoEm);
    }
}
