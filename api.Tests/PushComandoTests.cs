using One.Api.Chamados;

namespace One.Api.Tests;

public class PushComandoTests
{
    static (int codigo, string saida, string erro) Rodar(params string[] args)
    {
        var (saida, erro) = (new StringWriter(), new StringWriter());
        return (PushComando.Executar(args, saida, erro), saida.ToString(), erro.ToString());
    }

    static byte[] Base64Url(string v) => Convert.FromBase64String(v.Replace('-', '+').Replace('_', '/').PadRight((v.Length + 3) / 4 * 4, '='));

    [Fact]
    public void Imprime_par_vapid_decodificavel()
    {
        var (codigo, saida, erro) = Rodar("chaves");
        Assert.Equal((0, ""), (codigo, erro));
        var linhas = saida.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.Equal(2, linhas.Length);
        Assert.StartsWith("PUSH_CHAVE_PUBLICA=", linhas[0]);
        Assert.StartsWith("PUSH_CHAVE_PRIVADA=", linhas[1]);
        var publica = Base64Url(linhas[0]["PUSH_CHAVE_PUBLICA=".Length..]);
        Assert.Equal(65, publica.Length);
        Assert.Equal(0x04, publica[0]);
        Assert.Equal(32, Base64Url(linhas[1]["PUSH_CHAVE_PRIVADA=".Length..]).Length);
    }

    [Fact]
    public void Dois_pares_diferem() => Assert.NotEqual(Rodar("chaves").saida, Rodar("chaves").saida);

    [Fact]
    public void Argumento_desconhecido_sai_1()
    {
        foreach (var args in new[] { new string[0], new[] { "outra" }, new[] { "chaves", "extra" } })
        {
            var (codigo, saida, erro) = Rodar(args);
            Assert.Equal((1, "", "uso: push chaves"), (codigo, saida, erro.Trim()));
        }
    }
}
