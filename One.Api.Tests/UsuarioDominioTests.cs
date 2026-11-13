using One.Api.Dados;

namespace One.Api.Tests;

public class UsuarioDominioTests
{
    static readonly DateTime Agora = new(2026, 11, 12, 12, 0, 0, DateTimeKind.Utc);

    static Usuario Novo() => Usuario.Criar(Cpf.Tentar("11144477735")!, "Maria Teste", "maria@teste.one", [Papeis.Aluno]);

    [Fact]
    public void Definir_senha_grava_hash_zera_a_troca_e_marca_o_token_usado()
    {
        var u = Novo();
        u.DefinirSenhaTemporaria("temporario");
        var token = TokenAcesso.Criar(1, "hash-do-token", Agora, TimeSpan.FromMinutes(60));

        u.DefinirSenha("hash-novo", token, Agora.AddMinutes(5));

        Assert.Equal(("hash-novo", false, (DateTime?)Agora.AddMinutes(5)), (u.SenhaHash, u.DeveTrocarSenha, token.UsadoEm));
    }

    [Fact]
    public void Trocar_senha_grava_hash_e_zera_a_troca()
    {
        var u = Novo();
        u.DefinirSenhaTemporaria("temporario");
        Assert.True(u.DeveTrocarSenha);

        u.TrocarSenha("hash-novo");

        Assert.Equal(("hash-novo", false), (u.SenhaHash, u.DeveTrocarSenha));
    }

    [Fact]
    public void Desativar_marca_inativo()
    {
        var u = Novo();
        Assert.True(u.Ativo);

        u.Desativar();

        Assert.False(u.Ativo);
    }

    [Fact]
    public void Criar_traz_os_dados_os_papeis_e_nenhuma_senha()
    {
        var u = Novo();

        Assert.Equal(("11144477735", "Maria Teste", "maria@teste.one", true, (string?)null, false), (u.Cpf.Valor, u.Nome, u.Email, u.Ativo, u.SenhaHash, u.DeveTrocarSenha));
        Assert.True(u.Tem(Papeis.Aluno));
        Assert.False(u.Tem(Papeis.Atendente));
    }

    [Fact]
    public void Definir_papeis_mantem_OPERADOR_remove_os_ausentes_e_nao_duplica()
    {
        var u = Usuario.Criar(Cpf.Tentar("11144477735")!, "Maria Teste", "maria@teste.one", [Papeis.Aluno, Papeis.Operador]);

        u.DefinirPapeis([Papeis.Atendente, Papeis.Atendente]);

        Assert.Equal([Papeis.Operador, Papeis.Atendente], u.Papeis.Select(p => p.Papel));
    }

    [Fact]
    public void Definir_senha_temporaria_grava_hash_e_exige_troca()
    {
        var u = Novo();
        u.TrocarSenha("antigo");

        u.DefinirSenhaTemporaria("hash-temporario");

        Assert.Equal(("hash-temporario", true), (u.SenhaHash, u.DeveTrocarSenha));
    }

    [Fact]
    public void Vincular_setores_remove_os_ausentes_e_acrescenta_os_novos()
    {
        var u = Novo();
        u.VincularSetores([1, 2]);

        u.VincularSetores([2, 3]);

        Assert.Equal([2L, 3L], u.Setores.Select(a => a.SetorId).Order());
    }

    [Fact]
    public void Atualizar_troca_cpf_nome_e_email()
    {
        var u = Novo();

        u.Atualizar(new DadosUsuario(Cpf.Tentar("52998224725")!, "Maria Souza", "souza@teste.one"));

        Assert.Equal(("52998224725", "Maria Souza", "souza@teste.one"), (u.Cpf.Valor, u.Nome, u.Email));
    }
}