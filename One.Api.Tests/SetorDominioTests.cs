using One.Api.Dados;

namespace One.Api.Tests;

public class SetorDominioTests
{
    [Theory]
    [InlineData("", false, null, null, "Informe o nome do setor.")]
    [InlineData("Financeiro", false, 5L, null, "Informe o curso e o semestre da liderança juntos.")]
    [InlineData("Líderes", false, 5L, 0, "O semestre deve ficar entre 1 e 12.")]
    [InlineData("Líderes", false, 5L, 13, "O semestre deve ficar entre 1 e 12.")]
    [InlineData("Líderes", true, 5L, 3, "O setor de triagem não pode ser uma liderança.")]
    public void Validar_cada_regra_pura(string nome, bool triagem, long? cursoId, int? semestre, string motivo)
    {
        Assert.Equal(new Invalido(motivo), Setor.Validar(nome, triagem, cursoId, semestre));
    }

    [Fact]
    public void Validar_limita_o_nome_a_100_caracteres()
    {
        Assert.Null(Setor.Validar(new string('a', 100), false, null, null));
        Assert.Equal(new Invalido(Setor.MotivoNome), Setor.Validar(new string('a', 101), false, null, null));
        Assert.Equal(new Invalido(Setor.MotivoNome), Setor.Validar("", false, null, null));
    }

    [Fact]
    public void Validar_aceita_setor_comum_e_lideranca()
    {
        Assert.Null(Setor.Validar("Financeiro", false, null, null));
        Assert.Null(Setor.Validar("Líderes", false, 5, 3));
    }

    [Fact]
    public void Validar_acusa_curso_que_nao_existe_antes_da_triagem()
    {
        Assert.Equal(new Invalido("Escolha um curso da instituição."), Setor.Validar("Líderes", true, 5, 3, cursoExiste: false));
    }

    [Fact]
    public void Criar_sem_validar_lanca()
    {
        Assert.Throws<InvalidOperationException>(() => Setor.Criar("", false, null, null, null));
        Assert.Throws<InvalidOperationException>(() => Setor.Criar("Líderes", true, null, 5, 3));
    }

    [Fact]
    public void Criar_traz_os_dados_e_o_padrao_de_ativo()
    {
        var s = Setor.Criar("Líderes", null, null, 5, 3);

        Assert.Equal(("Líderes", false, true, (long?)5, (int?)3), (s.Nome, s.Triagem, s.Ativo, s.CursoId, s.Semestre));
    }

    [Fact]
    public void Alterar_troca_nome_triagem_e_ativo_e_mantem_a_turma()
    {
        var s = Setor.Criar("Líderes", null, null, 5, 3);

        s.Alterar("Líderes ADS", false, false);

        Assert.Equal(("Líderes ADS", false, false, (long?)5, (int?)3), (s.Nome, s.Triagem, s.Ativo, s.CursoId, s.Semestre));
    }
}
