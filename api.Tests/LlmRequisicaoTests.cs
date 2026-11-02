using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class LlmRequisicaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static List<JsonElement> Mensagens(JsonElement corpo) => corpo.GetProperty("messages").EnumerateArray().ToList();

    [Fact]
    public async Task Mascara_numeros_e_emails()
    {
        var c = await Cenario.Criar(f);
        var originais = new[] { "2000567890", "123.456.789-09", "2000 5678 90", "65 99999-8888" };

        await c.Primeira($"boleto: {originais[0]} | cpf {originais[1]} | mat {originais[2]} | tel {originais[3]} | email aluno@x.com | turma 1234567");

        var corpo = f.Llm.Corpos[^1];
        var ultima = Mensagens(f.Llm.UltimoCorpo)[^1].GetProperty("content").GetString()!;
        Assert.Equal("boleto: [número removido] | cpf [número removido] | mat [número removido] | tel [número removido] | email [e-mail removido] | turma 1234567", ultima);
        foreach (var o in originais.Append("aluno@x.com")) Assert.DoesNotContain(o, corpo);
    }

    [Fact]
    public async Task Corpo_so_traz_o_permitido()
    {
        var c = await Cenario.Criar(f);
        var u = c.Aluno.Usuario;
        var matricula = await f.Db(c.Instituicao.Id, db => db.Matriculas.Include(m => m.Curso).SingleAsync(m => m.UsuarioId == u.Id));
        var outra = await f.Instituicao();
        await f.Artigo(outra, "Artigo da outra instituição", "Texto que só existe na outra instituição.");
        await f.Categoria(outra, "Categoria da outra instituição");
        await f.Artigo(c.Instituicao, "Artigo em rascunho", "Texto do rascunho.", estado: EstadosArtigo.Rascunho);
        await f.Artigo(c.Instituicao, "Artigo arquivado", "Texto do arquivado.", estado: EstadosArtigo.Arquivado);
        await f.Categoria(c.Instituicao, "Categoria ativa");
        await f.Categoria(c.Instituicao, "Categoria desativada", ativa: false);

        // conversa com 11 mensagens; a 12ª sai pela API
        var conversaId = await f.Db(c.Instituicao.Id, async db =>
        {
            var conversa = new Conversa { AlunoId = u.Id, CriadaEm = DateTime.UtcNow, UltimaMensagemEm = DateTime.UtcNow };
            for (var n = 1; n <= 11; n++)
                conversa.Mensagens.Add(new MensagemConversa { Autor = n % 2 == 1 ? "ALUNO" : "ASSISTENTE", Texto = $"mensagem-{n:00}", TipoFinal = n % 2 == 1 ? null : "sem_base", CriadaEm = DateTime.UtcNow });
            db.Conversas.Add(conversa);
            await db.SaveChangesAsync();
            return conversa.Id;
        });
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{conversaId}/mensagens", new { mensagem = "mensagem-12" });

        var corpo = f.Llm.Corpos[^1];
        foreach (var proibido in new[] { u.Nome, u.Cpf, matricula.Numero, matricula.Curso!.Nome, "outra instituição", "rascunho", "arquivado", "Categoria desativada" })
            Assert.DoesNotContain(proibido, corpo);
        foreach (var permitido in new[] { "Como emitir o boleto do semestre", "Faltas não são abonadas", "Categoria ativa", "Não classificado" })
            Assert.Contains(permitido, corpo);

        var conversa = Mensagens(f.Llm.UltimoCorpo).Skip(3).Select(m => m.GetProperty("content").GetString()).ToList();
        Assert.Equal(Enumerable.Range(3, 10).Select(n => $"mensagem-{n:00}"), conversa);
    }

    [Fact]
    public async Task Parametros_e_ordem_do_prompt()
    {
        var c = await Cenario.Criar(f);

        await c.Primeira("onde tiro o boleto?");

        var pedido = f.Llm.Pedidos[^1];
        Assert.Equal(HttpMethod.Post, pedido.Method);
        Assert.Equal("https://llm.teste/v1/chat/completions", pedido.RequestUri!.ToString());
        var corpo = f.Llm.UltimoCorpo;
        Assert.Equal("deepseek-flash", corpo.GetProperty("model").GetString());
        Assert.Equal("json_object", corpo.GetProperty("response_format").GetProperty("type").GetString());
        Assert.Equal(0, corpo.GetProperty("temperature").GetDouble());
        Assert.Equal(800, corpo.GetProperty("max_tokens").GetInt32());
        Assert.False(corpo.TryGetProperty("thinking", out _));

        var m = Mensagens(corpo);
        Assert.Equal(4, m.Count);
        Assert.Equal(["system", "system", "system", "user"], m.Select(x => x.GetProperty("role").GetString()));
        Assert.Contains("Responda só com o que está nos artigos", m[0].GetProperty("content").GetString());
        Assert.StartsWith("Artigos", m[1].GetProperty("content").GetString());
        Assert.Contains(Cenario.RespostaBoleto, m[1].GetProperty("content").GetString());
        Assert.StartsWith("Categorias", m[2].GetProperty("content").GetString());
        Assert.Equal("onde tiro o boleto?", m[3].GetProperty("content").GetString());
    }
}
