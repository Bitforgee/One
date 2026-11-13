using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ProgramDespachoTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string UsoInstituicao = "uso: instituicao criar --slug --nome --fuso --admin-cpf --admin-nome --admin-email | instituicao carga --slug --arquivo | instituicao avaliar-busca --slug --arquivo | instituicao operador --slug --cpf [--remover]";

    async Task<(int? codigo, string saida, string erro, int servicosPedidos)> Despachar(params string[] args)
    {
        var (saida, erro, pedidos) = (new StringWriter(), new StringWriter(), 0);
        var tarefa = Program.Despachar(args, () => { pedidos++; return f.Services; }, saida, erro);
        return (tarefa is null ? null : await tarefa, saida.ToString(), erro.ToString(), pedidos);
    }

    [Fact]
    public async Task Push_chaves_imprime_o_par_sem_pedir_servicos()
    {
        var (codigo, saida, erro, pedidos) = await Despachar("push", "chaves");

        Assert.Equal((0, "", 0), (codigo, erro, pedidos));
        Assert.StartsWith("PUSH_CHAVE_PUBLICA=", saida);
        Assert.Contains("PUSH_CHAVE_PRIVADA=", saida);
    }

    [Fact]
    public async Task Push_com_argumento_desconhecido_sai_1_com_o_uso_do_push()
    {
        var (codigo, saida, erro, pedidos) = await Despachar("push", "outra");

        Assert.Equal((1, "", "uso: push chaves", 0), (codigo, saida, erro.Trim(), pedidos));
    }

    [Theory]
    [InlineData("instituicao")]
    [InlineData("instituicao", "desconhecido")]
    [InlineData("instituicao", "desconhecido", "--slug", "x")]
    public async Task Instituicao_desconhecida_sai_1_com_o_uso_da_base(params string[] args)
    {
        var (codigo, saida, erro, pedidos) = await Despachar(args);

        Assert.Equal((1, "", UsoInstituicao, 1), (codigo, saida, erro.Trim(), pedidos));
    }

    [Fact]
    public async Task Instituicao_avaliar_busca_chega_ao_comando_de_avaliacao()
    {
        var (codigo, saida, erro, pedidos) = await Despachar("instituicao", "avaliar-busca", "--slug", "nao-existe-" + Guid.NewGuid().ToString("N"), "--arquivo", "x.json");

        Assert.Equal((1, "", 1), (codigo, saida, pedidos));
        Assert.StartsWith("--slug: instituição \"nao-existe-", erro);
        Assert.DoesNotContain("uso:", erro);
    }

    [Theory]
    [InlineData]
    [InlineData("--urls", "http://localhost:0")]
    [InlineData("pushx", "chaves")]
    [InlineData("Instituicao", "criar")]
    public async Task Sem_comando_nao_despacha_e_nao_pede_servicos(params string[] args)
    {
        var (codigo, saida, erro, pedidos) = await Despachar(args);

        Assert.Equal((null, "", "", 0), (codigo, saida, erro, pedidos));
    }
}
