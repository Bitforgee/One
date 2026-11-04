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

        // RAG C5: regras, trechos buscados (id, título, texto e links do artigo de origem), categorias ativas e as últimas 10 mensagens
        var corpo = f.Llm.Corpos[^1];
        foreach (var proibido in new[] { u.Nome, u.Cpf, matricula.Numero, matricula.Curso!.Nome, "outra instituição", "rascunho", "arquivado", "Categoria desativada" })
            Assert.DoesNotContain(proibido, corpo);
        foreach (var permitido in new[] { "Como emitir o boleto do semestre", "Faltas não são abonadas", Cenario.RespostaBoleto, Cenario.LinkBoleto, "Categoria ativa", "Não classificado" })
            Assert.Contains(permitido, corpo);
        var fontes = JsonDocument.Parse(Mensagens(f.Llm.UltimoCorpo)[1].GetProperty("content").GetString()!["Fontes (JSON):\n".Length..]).RootElement.EnumerateArray().ToList();
        Assert.Equal(["id", "titulo", "texto", "links"], fontes[0].EnumerateObject().Select(p => p.Name));
        Assert.Contains(fontes, x => x.GetProperty("id").GetInt64() == Semente.Fonte(c.Boleto.Id));

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
        // RAG C1 (door R1): corpo do Chat Completions da OpenAI
        var corpo = f.Llm.UltimoCorpo;
        Assert.Equal("gpt-6-luna", corpo.GetProperty("model").GetString());
        Assert.Equal("json_object", corpo.GetProperty("response_format").GetProperty("type").GetString());
        Assert.Equal(800, corpo.GetProperty("max_completion_tokens").GetInt32());
        Assert.Equal("none", corpo.GetProperty("reasoning_effort").GetString());
        foreach (var ausente in new[] { "max_tokens", "temperature", "thinking" })
            Assert.False(corpo.TryGetProperty(ausente, out _), ausente);

        var m = Mensagens(corpo);
        Assert.Equal(4, m.Count);
        Assert.Equal(["system", "system", "system", "user"], m.Select(x => x.GetProperty("role").GetString()));
        Assert.Contains("Responda só com o que está nas fontes", m[0].GetProperty("content").GetString());
        // a tela tira o link do texto e mostra um botão: o link vem no fim da frase, depois de dois-pontos
        Assert.Contains("Escreva cada link no fim da frase, depois de dois-pontos", m[0].GetProperty("content").GetString());
        Assert.StartsWith("Fontes", m[1].GetProperty("content").GetString());
        Assert.Contains(Cenario.RespostaBoleto, m[1].GetProperty("content").GetString());
        Assert.StartsWith("Categorias", m[2].GetProperty("content").GetString());
        Assert.Equal("onde tiro o boleto?", m[3].GetProperty("content").GetString());
    }

    // refatoracao-solid C16: o cliente "llm" registrado uma vez dá a URL base e a chave também aos embeddings
    [Fact]
    public async Task Embeddings_usam_a_url_base()
    {
        var c = await Cenario.Criar(f);
        var antes = f.Llm.UrisEmbeddings.Count;

        await c.Primeira("onde tiro o boleto?");

        Assert.Equal(["https://llm.teste/v1/embeddings"], f.Llm.UrisEmbeddings.Skip(antes).Select(u => u.ToString()));
        Assert.Equal("Bearer chave-teste", f.Llm.AutorizacoesEmbeddings[^1]);
        Assert.Equal("https://llm.teste/v1/chat/completions", f.Llm.Pedidos[^1].RequestUri!.ToString());
        Assert.Equal("Bearer chave-teste", f.Llm.Pedidos[^1].Headers.Authorization?.ToString());
    }

    // anexos-assistente: a forma da porta 3 no corpo enviado ao provedor
    static MultipartFormDataContent Anexando(string mensagem, params (string nome, byte[] bytes)[] arquivos)
    {
        var form = new MultipartFormDataContent { { new StringContent(mensagem), "mensagem" } };
        foreach (var (nome, bytes) in arquivos) form.Add(new ByteArrayContent(bytes), "anexos", nome);
        return form;
    }

    static List<JsonElement> Usuario(JsonElement corpo) => Mensagens(corpo).Where(m => m.GetProperty("role").GetString() == "user").ToList();

    static bool TemAnexo(JsonElement corpo) => Usuario(corpo).Any(m => m.GetProperty("content").ValueKind == JsonValueKind.Array
        && m.GetProperty("content").EnumerateArray().Any(p => p.GetProperty("type").GetString() is "image_url" or "file"));

    [Fact]
    public async Task Anexos_vao_como_partes_da_mensagem()
    {
        var c = await Cenario.Criar(f);
        byte[] jpg = Balcao.Arquivo(Balcao.Jpg, 120), png = Balcao.Arquivo(Balcao.Png, 130), pdf = Balcao.Arquivo(Balcao.Pdf, 140);

        await c.Cliente.PostAsync("/api/conversas", Anexando("esse boleto está certo?", ("a.jpg", jpg), ("b.png", png), ("c.pdf", pdf)));

        var content = Usuario(f.Llm.UltimoCorpo)[^1].GetProperty("content");
        var partes = content.EnumerateArray().ToList();
        Assert.Equal(4, partes.Count);
        Assert.Equal("""{"type":"text","text":"esse boleto está certo?"}""", partes[0].GetRawText());
        Assert.Equal($$$"""{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,{{{Convert.ToBase64String(jpg)}}}"}}""", partes[1].GetRawText());
        Assert.Equal($$$"""{"type":"image_url","image_url":{"url":"data:image/png;base64,{{{Convert.ToBase64String(png)}}}"}}""", partes[2].GetRawText());
        Assert.Equal($$$"""{"type":"file","file":{"filename":"anexo-3.pdf","file_data":"data:application/pdf;base64,{{{Convert.ToBase64String(pdf)}}}"}}""", partes[3].GetRawText());
        Assert.DoesNotContain("detail", f.Llm.Corpos[^1].Replace("detalhe", ""));
    }

    [Fact]
    public async Task Anexo_reenviado_enquanto_esta_nas_10_ultimas()
    {
        var c = await Cenario.Criar(f);
        var png = Balcao.Arquivo(Balcao.Png, 150);
        var id = (await (await c.Cliente.PostAsync("/api/conversas", Anexando("olha", ("a.png", png)))).Json()).GetProperty("conversaId").GetInt64();

        await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "e agora?" });

        var usuario = Usuario(f.Llm.UltimoCorpo);
        Assert.Equal(2, usuario.Count);
        Assert.Equal(JsonValueKind.String, usuario[1].GetProperty("content").ValueKind);
        var partes = usuario[0].GetProperty("content").EnumerateArray().ToList();
        Assert.Equal("data:image/png;base64," + Convert.ToBase64String(png), partes[1].GetProperty("image_url").GetProperty("url").GetString());
    }

    [Fact]
    public async Task Anexo_fora_das_10_ultimas_nao_vai()
    {
        var c = await Cenario.Criar(f);
        var id = (await (await c.Cliente.PostAsync("/api/conversas", Anexando("olha", ("a.png", Balcao.Arquivo(Balcao.Png, 150))))).Json()).GetProperty("conversaId").GetInt64();

        // turnos 2 a 5: no 5º o histórico tem 9 mensagens e o anexo ainda cabe
        for (var n = 2; n <= 5; n++) await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = $"turno {n}" });
        Assert.True(TemAnexo(f.Llm.UltimoCorpo));

        // no 6º o histórico tem 11 mensagens e a primeira sai da janela
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "turno 6" });
        Assert.False(TemAnexo(f.Llm.UltimoCorpo));
        Assert.DoesNotContain("image_url", f.Llm.Corpos[^1]);
        Assert.DoesNotContain("\"file\"", f.Llm.Corpos[^1]);
    }

    [Fact]
    public async Task Nome_original_do_anexo_nao_vai_ao_provedor()
    {
        var c = await Cenario.Criar(f);

        await c.Cliente.PostAsync("/api/conversas", Anexando("meu cpf 123.456.789-09", ("boleto-maria-silva-12345678909.pdf", Balcao.Arquivo(Balcao.Pdf, 100))));

        var corpo = f.Llm.Corpos[^1];
        foreach (var proibido in new[] { "boleto-maria-silva", "12345678909", "123.456.789-09" }) Assert.DoesNotContain(proibido, corpo);
        var partes = Usuario(f.Llm.UltimoCorpo)[^1].GetProperty("content").EnumerateArray().ToList();
        Assert.Equal("meu cpf [número removido]", partes[0].GetProperty("text").GetString());
        Assert.Equal("anexo-1.pdf", partes[1].GetProperty("file").GetProperty("filename").GetString());
    }

    [Fact]
    public async Task Sem_anexo_content_continua_texto()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira("onde tiro o boleto?");
        await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "e o prazo?" });

        var usuario = Usuario(f.Llm.UltimoCorpo);

        Assert.Equal(2, usuario.Count);
        Assert.All(usuario, m => Assert.Equal(JsonValueKind.String, m.GetProperty("content").ValueKind));
    }

    [Fact]
    public async Task Regra_8_dos_anexos_no_prompt()
    {
        var c = await Cenario.Criar(f);

        await c.Primeira();

        var regras = Mensagens(f.Llm.UltimoCorpo)[0].GetProperty("content").GetString()!;
        Assert.Contains("8. Anexos do aluno servem só para entender o caso; não são fontes. Não copie trechos de anexos nem repita dados pessoais que aparecem neles.", regras.Split((char)10).Select(l => l.Trim()));
    }

    [Fact]
    public async Task Log_traz_a_quantidade_de_anexos()
    {
        var com = await Cenario.Criar(f);
        var sem = await Cenario.Criar(f);

        await com.Cliente.PostAsync("/api/conversas", Anexando("olha", ("a.png", Balcao.Arquivo(Balcao.Png, 50)), ("b.png", Balcao.Arquivo(Balcao.Png, 50)), ("c.pdf", Balcao.Arquivo(Balcao.Pdf, 50))));
        await sem.Primeira();

        object? Anexos(Cenario c) => Assert.Single(f.Logs.Entradas, l => l.Mensagem.StartsWith("Chamada ao provedor de IA") && Equals(l.Campos.GetValueOrDefault("InstituicaoId"), c.Instituicao.Id)).Campos["Anexos"];
        Assert.Equal(3, Anexos(com));
        Assert.Equal(0, Anexos(sem));
    }
}
