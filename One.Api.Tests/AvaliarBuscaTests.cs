using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Instituicoes;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// RAG S4: `instituicao avaliar-busca` mede a busca do assistente com perguntas e a fonte esperada.
public class AvaliarBuscaTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<(int codigo, string saida, string erro)> Rodar(params string[] args)
    {
        var (saida, erro) = (new StringWriter(), new StringWriter());
        var codigo = await InstituicaoComando.Executar(f.Services, args, saida, erro);
        return (codigo, saida.ToString(), erro.ToString());
    }

    static string Arquivo(object conteudo)
    {
        var caminho = Path.GetTempFileName();
        File.WriteAllText(caminho, conteudo as string ?? JsonSerializer.Serialize(conteudo));
        return caminho;
    }

    // Seis artigos ativos indexados (o vetor do provedor falso aproxima textos com palavras em comum).
    // "boleto vencido segunda via" fica mais perto de A1, depois A2, depois A3 ("Boleto pagamento");
    // "estacionamento campus" não tem palavra em comum com nenhum: empate, e o desempate por id deixa o último artigo fora dos 5.
    async Task<Instituicao> Base()
    {
        var i = await f.Instituicao();
        await f.Artigo(i, "Boleto vencido segunda via", "boleto vencido segunda via");
        await f.Artigo(i, "Boleto vencido", "boleto vencido");
        await f.Artigo(i, "Boleto pagamento", "boleto pagamento banco");
        await f.Artigo(i, "Rematricula prazo", "rematricula prazo calendario");
        await f.Artigo(i, "Biblioteca horario", "biblioteca horario sabado");
        await f.Artigo(i, "Estagio obrigatorio", "estagio obrigatorio termo");
        await f.Artigo(i, "Artigo arquivado", "arquivado", estado: EstadosArtigo.Arquivado);
        return i;
    }

    static readonly object[] Perguntas =
    [
        new { pergunta = "rematricula prazo", fonte = "Rematricula prazo" },
        new { pergunta = "boleto vencido segunda via", fonte = "Boleto pagamento" },
        new { pergunta = "estacionamento campus", fonte = "Estagio obrigatorio" },
    ];

    // C41
    [Fact]
    public async Task Avaliacao_valida_sai_0()
    {
        var i = await Base();

        var (codigo, saida, erro) = await Rodar("avaliar-busca", "--slug", i.Slug, "--arquivo", Arquivo(Perguntas));

        Assert.Equal((0, ""), (codigo, erro));
        var linhas = saida.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.Equal(4, linhas.Length);
        Assert.StartsWith("acerto 1: rematricula prazo -> Rematricula prazo (", linhas[0]);
        Assert.StartsWith("acerto 3: boleto vencido segunda via -> Boleto vencido segunda via (", linhas[1]);
        Assert.Contains("| Boleto vencido (", linhas[1]);
        Assert.Contains("| Boleto pagamento (", linhas[1]);
        Assert.StartsWith("erro: estacionamento campus (esperado \"Estagio obrigatorio\") -> ", linhas[2]);
        foreach (var titulo in new[] { "Boleto vencido segunda via", "Boleto vencido", "Boleto pagamento", "Rematricula prazo", "Biblioteca horario" })
            Assert.Contains($"{titulo} (", linhas[2]);
        Assert.DoesNotContain("Estagio obrigatorio (", linhas[2]);
        Assert.Equal("2/3", linhas[3]);
    }

    Task<long[]> Linhas() => f.Db(null, async db => new[]
    {
        await db.Instituicoes.CountAsync(),
        await db.Artigos.IgnoreQueryFilters().CountAsync(),
        await db.VersoesArtigo.IgnoreQueryFilters().CountAsync(),
        await db.Documentos.IgnoreQueryFilters().CountAsync(),
        await db.TrechosFonte.IgnoreQueryFilters().CountAsync(),
        await db.TrechosFonte.IgnoreQueryFilters().CountAsync(t => t.Embedding != null),
        await db.TrechosFonte.IgnoreQueryFilters().SumAsync(t => (long)t.Tentativas),
        await db.Conversas.IgnoreQueryFilters().CountAsync(),
        await db.MensagensConversa.IgnoreQueryFilters().CountAsync(),
        await db.Chamados.IgnoreQueryFilters().CountAsync(),
        await db.Usuarios.IgnoreQueryFilters().CountAsync(),
        await db.Citacoes.IgnoreQueryFilters().CountAsync(),
        await db.EmailsSaida.IgnoreQueryFilters().CountAsync(),
    });

    // C42
    [Fact]
    public async Task Nao_chama_chat_nem_grava()
    {
        var i = await Base();
        await f.Db(i.Id, async db =>
        {
            var d = Documento.Criar("Regulamento de estagio", (await db.Categorias.FirstAsync()).Id,
                new VersaoDocumento { Numero = 1, NomeArquivo = "r.pdf", Chave = $"1/documentos/{Guid.NewGuid():N}", Hash = new string('a', 64), Tamanho = 1, Texto = "t", Paginas = 1, CriadaEm = DateTime.UtcNow });
            db.Documentos.Add(d);
            await db.SaveChangesAsync();
        });
        // o título de um documento ativo também é fonte aceita
        var arquivo = Arquivo(Perguntas.Append(new { pergunta = "horas de estagio", fonte = "Regulamento de estagio" }).ToArray());
        var (chat, embeddings, antes) = (f.Llm.Corpos.Count, f.Llm.CorposEmbeddings.Count, await Linhas());

        var (codigo, saida, _) = await Rodar("avaliar-busca", "--slug", i.Slug, "--arquivo", arquivo);

        Assert.Equal(0, codigo);
        Assert.EndsWith("/4", saida.Trim());
        Assert.Equal(chat, f.Llm.Corpos.Count);
        Assert.Equal(embeddings + 4, f.Llm.CorposEmbeddings.Count);
        Assert.Equal(antes, await Linhas());
    }

    // C43
    [Fact]
    public async Task Arquivo_invalido_sai_1()
    {
        var i = await Base();
        var casos = new (string caso, string[] args, string[] esperado)[]
        {
            ("slug inexistente", ["avaliar-busca", "--slug", "nao-existe", "--arquivo", Arquivo(Perguntas)], ["--slug: instituição \"nao-existe\" não existe"]),
            ("não é JSON", ["avaliar-busca", "--slug", i.Slug, "--arquivo", Arquivo("isto não é json")], ["--arquivo: JSON inválido"]),
            ("arquivo inexistente", ["avaliar-busca", "--slug", i.Slug, "--arquivo", "nao-existe.json"], ["--arquivo: arquivo \"nao-existe.json\" não encontrado"]),
            ("lista vazia", ["avaliar-busca", "--slug", i.Slug, "--arquivo", Arquivo("[]")], ["--arquivo: nenhuma pergunta"]),
            ("JSON null", ["avaliar-busca", "--slug", i.Slug, "--arquivo", Arquivo("null")], ["--arquivo: nenhuma pergunta"]),
            ("pergunta vazia", ["avaliar-busca", "--slug", i.Slug, "--arquivo", Arquivo(new object[] { Perguntas[0], new { pergunta = " ", fonte = "Rematricula prazo" } })], ["[1].pergunta: obrigatória"]),
            ("fonte que não é título ativo", ["avaliar-busca", "--slug", i.Slug, "--arquivo", Arquivo(new object[] { new { pergunta = "x", fonte = "Artigo arquivado" }, new { pergunta = "y", fonte = "Não existe" } })],
                ["[0].fonte: \"Artigo arquivado\" não é título de artigo ou documento ativo", "[1].fonte: \"Não existe\" não é título de artigo ou documento ativo"]),
        };
        foreach (var (caso, args, esperado) in casos)
        {
            var embeddings = f.Llm.CorposEmbeddings.Count;
            var (codigo, saida, erro) = await Rodar(args);
            Assert.True(codigo == 1, caso);
            Assert.Equal("", saida);
            foreach (var e in esperado) Assert.Contains(e, erro);
            Assert.Equal(embeddings, f.Llm.CorposEmbeddings.Count);
        }

        // provedor de embeddings fora: sai com 1 e diz o motivo
        f.Llm.ResponderEmbeddings = (_, _) => Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.InternalServerError));
        try
        {
            var (codigo, saida, erro) = await Rodar("avaliar-busca", "--slug", i.Slug, "--arquivo", Arquivo(Perguntas));
            Assert.Equal(1, codigo);
            Assert.DoesNotContain("/3", saida);
            Assert.Contains("embeddings: falha ao gerar o vetor da pergunta \"rematricula prazo\"", erro);
        }
        finally { f.Llm.ResponderEmbeddings = null; }
    }
}
