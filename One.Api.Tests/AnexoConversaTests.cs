using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// anexos-assistente: o aluno anexa foto e PDF na conversa, a equipe vê no chamado transferido.
public class AnexoConversaTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string SemBase = "Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente.";
    const int DezMiB = 10 * 1024 * 1024;

    static MultipartFormDataContent Form(string? mensagem, params (string nome, byte[] bytes)[] arquivos)
    {
        var form = new MultipartFormDataContent();
        if (mensagem is not null) form.Add(new StringContent(mensagem), "mensagem");
        foreach (var (nome, bytes) in arquivos) form.Add(new ByteArrayContent(bytes), "anexos", nome);
        return form;
    }

    static Task<HttpResponseMessage> Nova(HttpClient c, string? mensagem, params (string nome, byte[] bytes)[] arquivos) =>
        c.PostAsync("/api/conversas", Form(mensagem, arquivos));

    static Task<HttpResponseMessage> Seguinte(HttpClient c, long id, string? mensagem, params (string nome, byte[] bytes)[] arquivos) =>
        c.PostAsync($"/api/conversas/{id}/mensagens", Form(mensagem, arquivos));

    static byte[] Png(int tamanho = 200) => Balcao.Arquivo(Balcao.Png, tamanho);

    async Task<(long mensagens, long anexos, string chaves, int chamadasAoProvedor)> Estado(Cenario c)
    {
        var (m, a) = await f.Db(c.Instituicao.Id, async db => (await db.MensagensConversa.CountAsync(), await db.AnexosConversa.CountAsync()));
        return (m, a, string.Join("|", await f.Chaves()), f.Llm.Corpos.Count);
    }

    async Task<List<AnexoConversa>> Anexos(Cenario c) =>
        await f.Db(c.Instituicao.Id, db => db.AnexosConversa.OrderBy(x => x.Id).ToListAsync());

    static async Task<string> Detalhe(HttpResponseMessage r) => (await r.Json()).GetProperty("detail").GetString()!;

    [Fact]
    public async Task Primeira_mensagem_com_anexo_grava_objeto_e_linha()
    {
        var c = await Cenario.Criar(f);
        var bytes = Png(500);

        var r = await Nova(c.Cliente, "esse boleto está certo?", ("boleto.png", bytes));

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await r.Json();
        Assert.Equal(["conversaId", "resposta"], j.EnumerateObject().Select(p => p.Name));
        Assert.Equal(["tipo", "texto"], j.GetProperty("resposta").EnumerateObject().Select(p => p.Name));
        var anexo = Assert.Single(await Anexos(c));
        var mensagem = await f.Db(c.Instituicao.Id, db => db.MensagensConversa.SingleAsync(m => m.Id == anexo.MensagemConversaId));
        Assert.Equal("ALUNO", mensagem.Autor);
        Assert.Equal(j.GetProperty("conversaId").GetInt64(), mensagem.ConversaId);
        Assert.Equal("boleto.png", anexo.Nome);
        Assert.Equal("image/png", anexo.Tipo);
        Assert.Equal(bytes.Length, anexo.Tamanho);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(bytes)), anexo.Hash);
        Assert.StartsWith($"{c.Instituicao.Id}/anexos-conversa/", anexo.Chave);
        Assert.Equal(bytes, await f.Objeto(anexo.Chave));
    }

    [Fact]
    public async Task Mensagem_com_tres_anexos_grava_os_tres()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();

        var r = await Seguinte(c.Cliente, id, "seguem os três", ("a.jpg", Balcao.Arquivo(Balcao.Jpg, 100)), ("b.png", Png()), ("c.pdf", Balcao.Arquivo(Balcao.Pdf, 100)));

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(["resposta"], (await r.Json()).EnumerateObject().Select(p => p.Name));
        var anexos = await Anexos(c);
        Assert.Equal(["image/jpeg", "image/png", "application/pdf"], anexos.Select(a => a.Tipo));
        Assert.Single(anexos.Select(a => a.MensagemConversaId).Distinct());
    }

    [Fact]
    public async Task Trecho_copiado_do_anexo_vira_sem_base()
    {
        var c = await Cenario.Criar(f);
        // o trecho T está no texto do PDF anexo e não existe na fonte citada
        const string t = "Vencimento em 15/11 para Maria Silva";
        f.Llm.Devolver(Cenario.Resposta("Seu boleto vence dia 15.", [c.Boleto.Id], (c.Boleto.Id, t)));

        var r = await Nova(c.Cliente, "esse boleto está certo?", ("boleto.pdf", Pdfs.Criar(t)));
        var j = await r.Json();

        Assert.Equal("sem_base", j.GetProperty("resposta").GetProperty("tipo").GetString());
        Assert.Equal(SemBase, j.GetProperty("resposta").GetProperty("texto").GetString());
        var id = j.GetProperty("conversaId").GetInt64();
        Assert.Contains(f.Logs.Entradas, l => l.Nivel == LogLevel.Warning && Equals(l.Campos.GetValueOrDefault("ConversaId"), id) && Equals(l.Campos.GetValueOrDefault("Motivo"), "trecho_invalido"));
    }

    [Fact]
    public async Task Arquivo_acima_de_10_MB_413_sem_gravar()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        var antes = await Estado(c);
        var grande = Balcao.Arquivo(Balcao.Png, DezMiB + 1);

        var nova = await Nova(c.Cliente, "oi", ("grande.png", grande));
        var seguinte = await Seguinte(c.Cliente, id, "oi", ("grande.png", grande));

        foreach (var r in new[] { nova, seguinte })
        {
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, r.StatusCode);
            Assert.Equal("O arquivo grande.png passa de 10 MB.", await Detalhe(r));
        }
        Assert.Equal(antes, await Estado(c));

        // exatamente 10 MiB passa
        Assert.Equal(HttpStatusCode.OK, (await Seguinte(c.Cliente, id, "oi", ("limite.png", Balcao.Arquivo(Balcao.Png, DezMiB)))).StatusCode);
    }

    [Fact]
    public async Task Tipo_recusado_415_sem_gravar()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        var antes = await Estado(c);
        var recusados = new (string nome, byte[] bytes)[]
        {
            ("animacao.gif", "GIF89a"u8.ToArray().Concat(new byte[50]).ToArray()),
            ("foto.png", "isto é só texto, não uma imagem"u8.ToArray()),
        };

        foreach (var arquivo in recusados)
        {
            foreach (var r in new[] { await Nova(c.Cliente, "oi", arquivo), await Seguinte(c.Cliente, id, "oi", arquivo) })
            {
                Assert.Equal(HttpStatusCode.UnsupportedMediaType, r.StatusCode);
                Assert.Equal($"O arquivo {arquivo.nome} não é PDF, JPG nem PNG.", await Detalhe(r));
            }
            Assert.Equal(antes, await Estado(c));
        }
    }

    [Fact]
    public async Task Quarto_anexo_400_sem_gravar()
    {
        var c = await Cenario.Criar(f);
        var quatro = Enumerable.Range(1, 4).Select(n => ($"{n}.png", Png())).ToArray();
        var antes = await Estado(c);

        var primeira = await Nova(c.Cliente, "oi", quatro);

        Assert.Equal(HttpStatusCode.BadRequest, primeira.StatusCode);
        Assert.Equal("A conversa aceita até 3 anexos.", (await primeira.Json()).GetProperty("errors").GetProperty("anexos")[0].GetString());
        Assert.Equal(antes, await Estado(c));

        var (id, _) = await c.Primeira();
        Assert.Equal(HttpStatusCode.OK, (await Seguinte(c.Cliente, id, "dois", ("1.png", Png()), ("2.png", Png()))).StatusCode);
        antes = await Estado(c);

        var mais = await Seguinte(c.Cliente, id, "mais dois", ("3.png", Png()), ("4.png", Png()));

        Assert.Equal(HttpStatusCode.BadRequest, mais.StatusCode);
        Assert.Equal("A conversa aceita até 3 anexos.", (await mais.Json()).GetProperty("errors").GetProperty("anexos")[0].GetString());
        Assert.Equal(antes, await Estado(c));

        Assert.Equal(HttpStatusCode.OK, (await Seguinte(c.Cliente, id, "mais um", ("3.png", Png()))).StatusCode);
        Assert.Equal(3, (await Anexos(c)).Count);
    }

    [Fact]
    public async Task Texto_invalido_com_anexo_400_sem_gravar()
    {
        var c = await Cenario.Criar(f);
        var antes = await Estado(c);

        foreach (var texto in new[] { "", new string('a', 1001) })
        {
            var r = await Nova(c.Cliente, texto, ("a.png", Png()));
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.Equal("A mensagem deve ter de 1 a 1000 caracteres.", (await r.Json()).GetProperty("errors").GetProperty("mensagem")[0].GetString());
            Assert.Equal(antes.chaves, string.Join("|", await f.Chaves()));
        }
    }

    [Fact]
    public async Task Recusas_de_hoje_com_anexo_sem_gravar()
    {
        var c = await Cenario.Criar(f);
        var arquivo = ("a.png", Png());
        var (encerrada, _) = await c.Primeira();
        await c.Cliente.PostAsync($"/api/conversas/{encerrada}/encerrar", null);
        var outro = await f.AlunoLogado(c.Instituicao);
        var cheia = await f.Db(c.Instituicao.Id, async db =>
        {
            var conversa = new Conversa { AlunoId = c.Aluno.Usuario.Id, CriadaEm = DateTime.UtcNow, UltimaMensagemEm = DateTime.UtcNow };
            for (var n = 1; n <= 10; n++) conversa.Mensagens.Add(new MensagemConversa { Autor = "ALUNO", Texto = $"m{n}", CriadaEm = DateTime.UtcNow });
            db.Conversas.Add(conversa);
            await db.SaveChangesAsync();
            return conversa.Id;
        });
        var antes = await Estado(c);

        var encerradaR = await Seguinte(c.Cliente, encerrada, "oi", arquivo);
        var deOutro = await Seguinte(outro.Cliente, encerrada, "oi", arquivo);
        var cheiaR = await Seguinte(c.Cliente, cheia, "oi", arquivo);

        Assert.Equal(HttpStatusCode.Conflict, encerradaR.StatusCode);
        Assert.Equal("Esta conversa já foi encerrada.", await Detalhe(encerradaR));
        Assert.Equal(HttpStatusCode.NotFound, deOutro.StatusCode);
        Assert.Equal("Conversa não encontrada.", await Detalhe(deOutro));
        Assert.Equal(HttpStatusCode.Conflict, cheiaR.StatusCode);
        Assert.Equal("A conversa chegou ao limite de 10 mensagens. Fale com um atendente ou encerre.", await Detalhe(cheiaR));
        Assert.Equal(antes, await Estado(c));
    }

    [Fact]
    public async Task Minio_fora_na_primeira_mensagem_503_sem_conversa()
    {
        var c = await Cenario.Criar(f);
        var antes = await f.Db(c.Instituicao.Id, db => db.Conversas.CountAsync());
        var chamadas = f.Llm.Corpos.Count;

        HttpResponseMessage r;
        using (f.MinioFora()) r = await Nova(c.Cliente, "oi", ("a.png", Png()));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode);
        Assert.Equal("Armazenamento de arquivos indisponível.", await Detalhe(r));
        Assert.Equal(antes, await f.Db(c.Instituicao.Id, db => db.Conversas.CountAsync()));
        Assert.Equal(chamadas, f.Llm.Corpos.Count);
    }

    [Fact]
    public async Task Minio_fora_ao_gravar_503_sem_mensagem()
    {
        var c = await Cenario.Criar(f);
        var (id, _) = await c.Primeira();
        var antes = await Estado(c);

        HttpResponseMessage r;
        using (f.MinioFora()) r = await Seguinte(c.Cliente, id, "oi", ("a.png", Png()));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode);
        Assert.Equal("Armazenamento de arquivos indisponível.", await Detalhe(r));
        Assert.Equal(antes.mensagens, (await Estado(c)).mensagens);
        Assert.Equal(antes.chamadasAoProvedor, f.Llm.Corpos.Count);
    }

    [Fact]
    public async Task Minio_fora_ao_ler_anexo_sem_base_sem_chamar_provedor()
    {
        var c = await Cenario.Criar(f);
        var j = await (await Nova(c.Cliente, "esse boleto está certo?", ("a.png", Png()))).Json();
        var id = j.GetProperty("conversaId").GetInt64();
        var antes = f.Llm.Corpos.Count;

        HttpResponseMessage r;
        using (f.MinioFora()) r = await Seguinte(c.Cliente, id, "e agora?");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var resposta = (await r.Json()).GetProperty("resposta");
        Assert.Equal("sem_base", resposta.GetProperty("tipo").GetString());
        Assert.Equal(SemBase, resposta.GetProperty("texto").GetString());
        Assert.Contains(f.Logs.Entradas, l => l.Nivel == LogLevel.Warning && Equals(l.Campos.GetValueOrDefault("Motivo"), "anexo_indisponivel")
            && Equals(l.Campos.GetValueOrDefault("InstituicaoId"), c.Instituicao.Id) && Equals(l.Campos.GetValueOrDefault("ConversaId"), id));
        Assert.Equal(antes, f.Llm.Corpos.Count);
    }

    [Fact]
    public async Task Tres_arquivos_de_10_MB_aceitos()
    {
        var c = await Cenario.Criar(f);

        var r = await Nova(c.Cliente, "três grandes", ("1.png", Balcao.Arquivo(Balcao.Png, DezMiB)), ("2.png", Balcao.Arquivo(Balcao.Png, DezMiB)), ("3.png", Balcao.Arquivo(Balcao.Png, DezMiB)));

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.Equal(3, (await Anexos(c)).Count);
    }

    [Fact]
    public async Task Ver_conversa_lista_anexos_sem_chave_nem_hash()
    {
        var c = await Cenario.Criar(f);
        var bytes = Png(321);
        var id = (await (await Nova(c.Cliente, "olha", ("a.png", bytes), ("b.pdf", Balcao.Arquivo(Balcao.Pdf, 50)))).Json()).GetProperty("conversaId").GetInt64();

        var r = await c.Cliente.GetAsync($"/api/conversas/{id}");

        var corpo = await r.Content.ReadAsStringAsync();
        Assert.DoesNotContain("chave", corpo);
        Assert.DoesNotContain("hash", corpo);
        var mensagens = (await r.Json()).GetProperty("mensagens").EnumerateArray().ToList();
        var anexos = mensagens[0].GetProperty("anexos").EnumerateArray().ToList();
        var salvos = await Anexos(c);
        Assert.Equal(2, anexos.Count);
        Assert.All(anexos, a => Assert.Equal(["id", "nome", "tipo", "tamanho"], a.EnumerateObject().Select(p => p.Name)));
        Assert.Equal(salvos.Select(a => a.Id), anexos.Select(a => a.GetProperty("id").GetInt64()));
        Assert.Equal(["a.png", "b.pdf"], anexos.Select(a => a.GetProperty("nome").GetString()));
        Assert.Equal(["image/png", "application/pdf"], anexos.Select(a => a.GetProperty("tipo").GetString()));
        Assert.Equal(bytes.Length, anexos[0].GetProperty("tamanho").GetInt64());
        Assert.Equal(0, mensagens[1].GetProperty("anexos").GetArrayLength());
    }

    [Fact]
    public async Task Download_pelo_aluno_dono()
    {
        var c = await Cenario.Criar(f);
        var bytes = Png(777);
        await Nova(c.Cliente, "olha", ("meu boleto.png", bytes));
        var anexo = Assert.Single(await Anexos(c));

        var r = await c.Cliente.GetAsync($"/api/conversas/anexos/{anexo.Id}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(bytes, await r.Content.ReadAsByteArrayAsync());
        Assert.Equal("image/png", r.Content.Headers.ContentType!.MediaType);
        Assert.Contains("meu boleto.png", r.Content.Headers.ContentDisposition!.ToString());
        Assert.Equal(bytes.Length, r.Content.Headers.ContentLength);
    }

    [Fact]
    public async Task Download_negado_404_sem_abrir_objeto()
    {
        var b = await Balcao.Criar(f);
        var c = new Cenario(b.Instituicao, b.Aluno, null!, null!);
        var semChamado = (await (await Nova(b.ClienteAluno, "sem chamado", ("a.png", Png()))).Json()).GetProperty("conversaId").GetInt64();
        var comChamado = (await (await Nova(b.ClienteAluno, "com chamado", ("b.png", Png()))).Json()).GetProperty("conversaId").GetInt64();
        Assert.Equal(HttpStatusCode.Created, (await b.ClienteAluno.PostAsJsonAsync($"/api/conversas/{comChamado}/transferir", new { })).StatusCode);
        var anexos = await Anexos(c);
        var idSem = anexos[0].Id;
        var idCom = anexos[1].Id;
        var outroAluno = await f.AlunoLogado(b.Instituicao);
        var deFora = await f.AlunoLogado();
        var antes = f.LeiturasDeObjeto;

        var negados = new[]
        {
            await outroAluno.Cliente.GetAsync($"/api/conversas/anexos/{idSem}"),
            await b.A.Cliente.GetAsync($"/api/conversas/anexos/{idSem}"),
            await b.Alheio.Cliente.GetAsync($"/api/conversas/anexos/{idCom}"),
            await deFora.Cliente.GetAsync($"/api/conversas/anexos/{idSem}"),
            await b.ClienteAluno.GetAsync("/api/conversas/anexos/999999999"),
        };

        foreach (var r in negados)
        {
            Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
            Assert.Equal("Anexo não encontrado.", await Detalhe(r));
        }
        Assert.Equal(antes, f.LeiturasDeObjeto);
        Assert.NotEqual(semChamado, comChamado);
    }

    [Fact]
    public async Task Download_com_minio_fora_503()
    {
        var c = await Cenario.Criar(f);
        await Nova(c.Cliente, "olha", ("a.png", Png()));
        var anexo = Assert.Single(await Anexos(c));

        HttpResponseMessage r;
        using (f.MinioFora()) r = await c.Cliente.GetAsync($"/api/conversas/anexos/{anexo.Id}");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode);
    }

    [Fact]
    public async Task Tabela_anexo_conversa_com_fk_nao_nula()
    {
        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        async Task<List<string>> Consulta(string sql)
        {
            await using var cmd = new NpgsqlCommand(sql, con);
            await using var leitor = await cmd.ExecuteReaderAsync();
            var linhas = new List<string>();
            while (await leitor.ReadAsync()) linhas.Add(leitor.GetString(0));
            return linhas;
        }

        Assert.Equal(["NO"], await Consulta("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'anexo_conversa' AND column_name = 'mensagem_conversa_id'"));
        Assert.Equal(["NO"], await Consulta("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'anexo_conversa' AND column_name = 'instituicao_id'"));
        Assert.Equal(["mensagem_conversa"], await Consulta("""
            SELECT ccu.table_name FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'anexo_conversa' AND kcu.column_name = 'mensagem_conversa_id'
            """));
    }

    async Task<(Balcao b, string numero, long idAnexo, byte[] bytes)> Transferida()
    {
        var b = await Balcao.Criar(f);
        var bytes = Png(640);
        var id = (await (await Nova(b.ClienteAluno, "olha o boleto", ("boleto.png", bytes))).Json()).GetProperty("conversaId").GetInt64();
        Assert.Equal(HttpStatusCode.OK, (await b.ClienteAluno.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "e agora?" })).StatusCode);
        var r = await b.ClienteAluno.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { });
        var numero = (await r.Json()).GetProperty("numero").GetString()!;
        var anexo = await f.Db(b.Instituicao.Id, db => db.AnexosConversa.SingleAsync());
        return (b, numero, anexo.Id, bytes);
    }

    [Fact]
    public async Task Transcricao_do_chamado_traz_anexos_do_aluno()
    {
        var (b, numero, idAnexo, bytes) = await Transferida();

        var detalhe = await b.Detalhe(b.A.Cliente, numero);

        var linhas = detalhe.GetProperty("transcricao").EnumerateArray().ToList();
        var doAluno = linhas.Where(l => l.GetProperty("autor").GetString() == "ALUNO").ToList();
        Assert.Equal(2, doAluno.Count);
        var anexo = Assert.Single(doAluno[0].GetProperty("anexos").EnumerateArray());
        Assert.Equal(["id", "nome", "tipo", "tamanho"], anexo.EnumerateObject().Select(p => p.Name));
        Assert.Equal(idAnexo, anexo.GetProperty("id").GetInt64());
        Assert.Equal("boleto.png", anexo.GetProperty("nome").GetString());
        Assert.Equal("image/png", anexo.GetProperty("tipo").GetString());
        Assert.Equal(bytes.Length, anexo.GetProperty("tamanho").GetInt64());
        Assert.Equal(0, doAluno[1].GetProperty("anexos").GetArrayLength());
    }

    [Fact]
    public async Task Download_pelo_atendente_do_chamado()
    {
        var (b, _, idAnexo, bytes) = await Transferida();

        var r = await b.A.Cliente.GetAsync($"/api/conversas/anexos/{idAnexo}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(bytes, await r.Content.ReadAsByteArrayAsync());
    }
}
