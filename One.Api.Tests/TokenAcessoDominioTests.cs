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

    [Fact]
    public void Criar_com_slug_devolve_o_token_em_claro_e_guarda_so_o_hash()
    {
        var (token, t) = TokenAcesso.Criar("univag", 7, Agora);

        Assert.Matches(@"^univag\.[A-Za-z0-9_-]{43}$", token);
        Assert.Equal((7L, One.Api.Tokens.Hash(token), Agora, Agora.AddMinutes(60)), (t.UsuarioId, t.Hash, t.CriadoEm, t.ExpiraEm));
        Assert.NotEqual(token, TokenAcesso.Criar("univag", 7, Agora).Token);
    }}