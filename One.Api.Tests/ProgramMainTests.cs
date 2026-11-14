using One.Api.Tests.Infra;

namespace One.Api.Tests;

[CollectionDefinition("Console", DisableParallelization = true)]
public sealed class ConsoleCollection;

[Collection("Console")]
public class ProgramMainTests
{
    static async Task<(int codigo, string saida, string erro)> Rodar(params string[] args)
    {
        var (saidaOriginal, erroOriginal) = (Console.Out, Console.Error);
        var (saida, erro) = (new StringWriter(), new StringWriter());
        Console.SetOut(saida);
        Console.SetError(erro);
        try
        {
            var codigo = await Program.Main(args);
            return (codigo, saida.ToString(), erro.ToString());
        }
        finally
        {
            Console.SetOut(saidaOriginal);
            Console.SetError(erroOriginal);
        }
    }

    [Fact]
    public async Task Main_push_chaves_sai_0_com_o_par_na_saida_padrao_e_nada_no_erro()
    {
        var (codigo, saida, erro) = await Rodar("push", "chaves");

        Assert.Equal((0, ""), (codigo, erro));
        Assert.StartsWith("PUSH_CHAVE_PUBLICA=", saida);
        Assert.Contains("PUSH_CHAVE_PRIVADA=", saida);
    }

    [Fact]
    public async Task Main_comando_desconhecido_sai_1_com_o_uso_na_saida_de_erro_e_nada_na_saida_padrao()
    {
        var (codigo, saida, erro) = await Rodar("push", "outra");

        Assert.Equal((1, "", "uso: push chaves"), (codigo, saida, erro.Trim()));
    }
}
