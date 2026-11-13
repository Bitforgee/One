using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Assistente;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class CorpoParaProvedorTests
{
    const string Arquivo = "provedor.txt";

    static async Task<OneFactory> NovaFabrica()
    {
        var f = new OneFactory();
        await f.InitializeAsync();
        return f;
    }

    static byte[] Bytes(byte[] assinatura, int tamanho) =>
        [.. assinatura, .. Enumerable.Range(0, tamanho - assinatura.Length).Select(n => (byte)(n * 7 + 3))];

    [Fact]
    public async Task Sem_anexo_igual_ao_golden()
    {
        await using var f = await NovaFabrica();
        var c = await Cenario.Criar(f);

        await c.Primeira("onde tiro o boleto?");

        Dourado.Igual(Arquivo, Dourado.Secao(Arquivo, "sem_anexo"), f.Llm.Corpos[^1]);
    }

    [Fact]
    public async Task Com_anexo_igual_ao_golden()
    {
        await using var f = await NovaFabrica();
        var c = await Cenario.Criar(f);
        var form = new MultipartFormDataContent { { new StringContent("esse boleto está certo?"), "mensagem" } };
        form.Add(new ByteArrayContent(Bytes(Balcao.Jpg, 40)), "anexos", "a.jpg");
        form.Add(new ByteArrayContent(Bytes(Balcao.Png, 41)), "anexos", "b.png");
        form.Add(new ByteArrayContent(Bytes(Balcao.Pdf, 42)), "anexos", "c.pdf");

        await c.Cliente.PostAsync("/api/conversas", form);

        Dourado.Igual(Arquivo, Dourado.Secao(Arquivo, "com_anexo"), f.Llm.Corpos[^1]);
    }

    [Fact]
    public async Task Embedding_igual_ao_golden()
    {
        await using var f = await NovaFabrica();

        await f.Services.GetRequiredService<Embeddings>().Gerar(["onde tiro o boleto?", "segunda via"]);

        Dourado.Igual(Arquivo, Dourado.Secao(Arquivo, "embedding"), f.Llm.CorposEmbeddings[^1]);
    }
}
