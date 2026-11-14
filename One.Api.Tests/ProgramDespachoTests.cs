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

    [Fact]
    public async Task Instituicao_criar_entrega_o_resto_dos_argumentos_e_cria()
    {
        var slug = "despacho-" + Guid.NewGuid().ToString("N")[..8];
        var (codigo, saida, erro, pedidos) = await Despachar("instituicao", "criar", "--slug", slug, "--nome", "Faculdade Teste", "--fuso", "America/Cuiaba",
            "--admin-cpf", Semente.NovoCpf(), "--admin-nome", "Coordenadora", "--admin-email", "admin@teste.edu.br");

        Assert.Equal((0, "", 1), (codigo, erro, pedidos));
        Assert.StartsWith($"Instituição {slug} criada.", saida);
        Assert.DoesNotContain("uso:", saida);
    }

    [Theory]
    [InlineData("carga", "--arquivo", "x.json")]
    [InlineData("operador", "--cpf", "000.000.000-00")]
    public async Task Instituicao_carga_e_operador_entregam_o_resto_dos_argumentos(params string[] verboEOpcoes)
    {
        var slug = "nao-existe-" + Guid.NewGuid().ToString("N");
        var (codigo, saida, erro, pedidos) = await Despachar(["instituicao", verboEOpcoes[0], "--slug", slug, .. verboEOpcoes[1..]]);

        Assert.Equal((1, "", 1), (codigo, saida, pedidos));
        Assert.StartsWith($"--slug: instituição \"{slug}\"", erro);
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
