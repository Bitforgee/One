namespace One.Api.Tests;

public class TokenAcessoDominioTests
{
    static readonly DateTime Agora = new(2026, 11, 12, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Criar_vale_ate_a_validade_e_nao_vem_usado()
    {
        var t = TokenAcesso.Criar(7, "hash", Agora, TimeSpan.FromMinutes(60));

        Assert.Equal((7L, "hash", Agora, Agora.AddMinutes(60), (DateTime?)null), (t.UsuarioId, t.Hash, t.CriadoEm, t.ExpiraEm, t.UsadoEm));
        Assert.True(t.Valido(Agora.AddMinutes(59)));
        Assert.False(t.Valido(Agora.AddMinutes(60)));
    }

    [Fact]
    public void Usado_deixa_de_ser_valido()
    {
        var t = TokenAcesso.Criar(7, "hash", Agora, TimeSpan.FromMinutes(60));

        t.Usar(Agora.AddMinutes(1));

        Assert.Equal(Agora.AddMinutes(1), t.UsadoEm);
        Assert.False(t.Valido(Agora.AddMinutes(2)));
    }
}