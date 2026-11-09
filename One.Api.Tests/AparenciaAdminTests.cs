using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class AparenciaAdminTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string RecusaDaCor = "Escolha uma cor mais escura: o texto branco precisa de contraste 4,5:1 sobre ela.";
    const string Url = "/api/admin/aparencia";

    async Task<(Instituicao, HttpClient)> Admin(Instituicao? i = null)
    {
        i ??= await f.Instituicao(nome: "Univag");
        return (i, await f.Entrar(i, await f.Usuario(i, [Papeis.Administrador])));
    }

    static JsonObject Valido() => JsonNode.Parse("""
        {"nomeCurto":"Univag","cor":"#224fa7",
         "login":{"titulo":"Fale com a Univag","frase":"Seu atendimento em um lugar só.","itens":["Chamados","Assistente","Documentos"]},
         "assistente":{"nome":"Vagner","boasVindas":"Oi! Posso ajudar com boletos e matrícula.","perguntas":["Como emito o boleto?","Posso abonar falta?"]},
         "contato":{"horario":"Seg a sex, 8h às 18h","telefone":"(65) 3688-6000","email":"atendimento@univag.edu.br"}}
        """)!.AsObject();

    static Task<HttpResponseMessage> Put(HttpClient c, JsonNode corpo) => c.PutAsync(Url, JsonContent.Create(corpo));

    static string[] Erros(JsonElement corpo, string campo) => [.. corpo.GetProperty("errors").GetProperty(campo).EnumerateArray().Select(e => e.GetString()!)];

    Task<Instituicao> Gravada(long id) => f.Db(null, db => db.Instituicoes.AsNoTracking().SingleAsync(i => i.Id == id));

    [Fact]
    public async Task Get_sem_aparencia_devolve_nulos()
    {
        var (_, admin) = await Admin();

        var r = await admin.GetAsync(Url);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var corpo = await r.Json();
        Assert.Equal(["nomeCurto", "cor", "login", "assistente", "contato", "imagens"], corpo.EnumerateObject().Select(p => p.Name));
        Assert.Equal(JsonValueKind.Null, corpo.GetProperty("nomeCurto").ValueKind);
        Assert.Equal(JsonValueKind.Null, corpo.GetProperty("cor").ValueKind);
        Assert.Equal(JsonValueKind.Null, corpo.GetProperty("login").GetProperty("titulo").ValueKind);
        Assert.Equal(0, corpo.GetProperty("login").GetProperty("itens").GetArrayLength());
        Assert.Equal(0, corpo.GetProperty("assistente").GetProperty("perguntas").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, corpo.GetProperty("contato").GetProperty("email").ValueKind);
        Assert.All(["logo", "icone", "login", "assistente"], t => Assert.Equal(JsonValueKind.Null, corpo.GetProperty("imagens").GetProperty(t).ValueKind));

        Assert.Equal(HttpStatusCode.OK, (await Put(admin, Valido())).StatusCode);
        var depois = await (await admin.GetAsync(Url)).Json();
        Assert.Equal("Univag", depois.GetProperty("nomeCurto").GetString());
        Assert.Equal("#224fa7", depois.GetProperty("cor").GetString());
        Assert.Equal(["Chamados", "Assistente", "Documentos"], depois.GetProperty("login").GetProperty("itens").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal("Vagner", depois.GetProperty("assistente").GetProperty("nome").GetString());
        Assert.Equal("(65) 3688-6000", depois.GetProperty("contato").GetProperty("telefone").GetString());
    }

    [Fact]
    public async Task Put_grava_e_campo_ausente_volta_ao_padrao()
    {
        var (i, admin) = await Admin();
        var (b, _) = await Admin();

        var r = await Put(admin, Valido());

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var corpo = await r.Json();
        Assert.Equal("Fale com a Univag", corpo.GetProperty("login").GetProperty("titulo").GetString());
        Assert.Equal("atendimento@univag.edu.br", corpo.GetProperty("contato").GetProperty("email").GetString());
        var linha = await Gravada(i.Id);
        Assert.Equal(("Univag", "#224fa7", "Fale com a Univag", "Vagner"), (linha.NomeCurto, linha.Cor, linha.LoginTitulo, linha.AssistenteNome));
        Assert.Equal(["Chamados", "Assistente", "Documentos"], linha.LoginItens);
        Assert.Equal(["Como emito o boleto?", "Posso abonar falta?"], linha.AssistentePerguntas);

        var segundo = Valido();
        segundo["login"]!.AsObject().Remove("titulo");
        segundo["cor"] = null;
        var r2 = await Put(admin, segundo);

        Assert.Equal(HttpStatusCode.OK, r2.StatusCode);
        var c2 = await r2.Json();
        Assert.Equal(JsonValueKind.Null, c2.GetProperty("cor").ValueKind);
        Assert.Equal(JsonValueKind.Null, c2.GetProperty("login").GetProperty("titulo").ValueKind);
        Assert.Equal("Univag", c2.GetProperty("nomeCurto").GetString());
        Assert.Equal("Seu atendimento em um lugar só.", c2.GetProperty("login").GetProperty("frase").GetString());
        var linha2 = await Gravada(i.Id);
        Assert.Null(linha2.Cor);
        Assert.Null(linha2.LoginTitulo);
        Assert.Equal("Vagner", linha2.AssistenteNome);

        var outra = await Gravada(b.Id);
        Assert.Null(outra.NomeCurto);
        Assert.Null(outra.AssistenteNome);
    }

    [Theory]
    [InlineData("224fa7", false)]
    [InlineData("#224fa", false)]
    [InlineData("#ffd700", false)]
    [InlineData("#777777", false)]
    [InlineData("#767676", true)]
    [InlineData("#224fa7", true)]
    public async Task Cor_invalida_ou_sem_contraste_400(string cor, bool aceita)
    {
        var (i, admin) = await Admin();
        var corpo = Valido();
        corpo["cor"] = cor;

        var r = await Put(admin, corpo);

        if (aceita)
        {
            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
            Assert.Equal(cor, (await Gravada(i.Id)).Cor);
            return;
        }
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal([RecusaDaCor], Erros(await r.Json(), "cor"));
        var linha = await Gravada(i.Id);
        Assert.Null(linha.Cor);
        Assert.Null(linha.NomeCurto);
    }

    public static TheoryData<string, int> Limites => new()
    {
        { "nomeCurto", 12 }, { "login.titulo", 60 }, { "login.frase", 160 }, { "login.itens", 80 }, { "assistente.nome", 40 },
        { "assistente.boasVindas", 300 }, { "assistente.perguntas", 100 }, { "contato.horario", 120 }, { "contato.telefone", 30 }, { "contato.email", 120 },
        { "login.itens#", 3 }, { "assistente.perguntas#", 4 },
    };

    static void Definir(JsonObject corpo, string campo, int tamanho)
    {
        var texto = new string('a', tamanho);
        if (campo.EndsWith('#'))
        {
            var (grupo, lista) = campo.TrimEnd('#').Split('.') is [var g, var l] ? (g, l) : throw new InvalidOperationException(campo);
            corpo[grupo]![lista] = new JsonArray([.. Enumerable.Range(0, tamanho).Select(n => (JsonNode?)$"item {n}")]);
            return;
        }
        var partes = campo.Split('.');
        if (partes.Length == 1) corpo[campo] = texto;
        else if (partes[1] is "itens" or "perguntas") corpo[partes[0]]![partes[1]] = new JsonArray(texto);
        else corpo[partes[0]]![partes[1]] = campo == "contato.email" ? new string('a', tamanho - 10) + "@teste.one" : texto;
    }

    [Theory]
    [MemberData(nameof(Limites))]
    public async Task Limites_dos_textos_400(string campo, int max)
    {
        var (i, admin) = await Admin();
        var chave = campo.TrimEnd('#');
        var aceito = Valido();
        Definir(aceito, campo, max);
        Assert.Equal(HttpStatusCode.OK, (await Put(admin, aceito)).StatusCode);

        var passou = Valido();
        passou["nomeCurto"] = "Outro";
        Definir(passou, campo, max + 1);
        var r = await Put(admin, passou);

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        var mensagens = Erros(await r.Json(), chave);
        Assert.Contains(mensagens, m => m.Contains(max.ToString()));
        Assert.NotEqual("Outro", (await Gravada(i.Id)).NomeCurto);
    }

    [Fact]
    public async Task Email_de_contato_invalido_400()
    {
        var (i, admin) = await Admin();
        var corpo = Valido();
        corpo["contato"]!["email"] = "nao-e-email";

        var r = await Put(admin, corpo);

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.NotEmpty(Erros(await r.Json(), "contato.email"));
        Assert.Null((await Gravada(i.Id)).ContatoEmail);
    }

    Task<List<ImagemInstituicao>> Linhas(long id) => f.Db(id, db => db.ImagensInstituicao.OrderBy(x => x.Tipo).ToListAsync());

    [Fact]
    public async Task Enviar_imagem_grava_e_reenviar_sobe_a_versao()
    {
        var (i, admin) = await Admin();
        var png = ImagemTeste.Png();

        var r = await ImagemTeste.Enviar(admin, "logo", png);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var corpo = await r.Json();
        Assert.Equal("logo", corpo.GetProperty("tipo").GetString());
        Assert.Equal(1, corpo.GetProperty("versao").GetInt32());
        var linha = Assert.Single(await Linhas(i.Id));
        Assert.StartsWith($"{i.Id}/aparencia/", linha.Chave);
        Assert.Equal(png, await f.Objeto(linha.Chave));
        Assert.Equal(("image/png", (long)png.Length, Armazenamento.Hash(png), 1), (linha.Conteudo, linha.Tamanho, linha.Hash, linha.Versao));

        var png2 = ImagemTeste.Png(tamanho: 80);
        var r2 = await ImagemTeste.Enviar(admin, "logo", png2);

        Assert.Equal(2, (await r2.Json()).GetProperty("versao").GetInt32());
        var linha2 = Assert.Single(await Linhas(i.Id));
        Assert.NotEqual(linha.Chave, linha2.Chave);
        Assert.StartsWith($"{i.Id}/aparencia/", linha2.Chave);
        Assert.Equal(2, linha2.Versao);
        var chaves = await f.Chaves();
        Assert.Contains(linha.Chave, chaves);
        Assert.Contains(linha2.Chave, chaves);
        Assert.Equal(png, await f.Objeto(linha.Chave));
    }

    [Fact]
    public async Task Tipo_de_imagem_recusado_415()
    {
        var (i, admin) = await Admin();
        var antes = (await f.Chaves()).Count;

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await ImagemTeste.Enviar(admin, "logo", Balcao.Arquivo("GIF89a"u8.ToArray(), 100))).StatusCode);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await ImagemTeste.Enviar(admin, "login", Balcao.Arquivo(Balcao.Pdf, 100))).StatusCode);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await ImagemTeste.Enviar(admin, "icone", ImagemTeste.Jpeg(100))).StatusCode);

        Assert.Empty(await Linhas(i.Id));
        Assert.Equal(antes, (await f.Chaves()).Count);
        foreach (var tipo in new[] { "login", "logo", "assistente" })
            Assert.Equal(HttpStatusCode.OK, (await ImagemTeste.Enviar(admin, tipo, ImagemTeste.Jpeg(100))).StatusCode);
        Assert.Equal(3, (await Linhas(i.Id)).Count);
    }

    [Fact]
    public async Task Imagem_acima_do_limite_413()
    {
        var (i, admin) = await Admin();
        const int Mb = 1024 * 1024;
        var antes = (await f.Chaves()).Count;

        foreach (var (tipo, limite) in new[] { ("logo", Mb), ("icone", Mb), ("assistente", Mb), ("login", 3 * Mb) })
        {
            var r = await ImagemTeste.Enviar(admin, tipo, ImagemTeste.Png(512, 512, limite + 1));
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, r.StatusCode);
            Assert.Contains($"{limite / Mb} MB", (await r.Json()).GetProperty("detail").GetString());
        }
        Assert.Empty(await Linhas(i.Id));
        Assert.Equal(antes, (await f.Chaves()).Count);

        foreach (var (tipo, limite) in new[] { ("logo", Mb), ("icone", Mb), ("assistente", Mb), ("login", 3 * Mb) })
            Assert.Equal(HttpStatusCode.OK, (await ImagemTeste.Enviar(admin, tipo, ImagemTeste.Png(512, 512, limite))).StatusCode);
    }

    [Theory]
    [InlineData(512, 511, false)]
    [InlineData(511, 511, false)]
    [InlineData(512, 512, true)]
    [InlineData(1024, 1024, true)]
    public async Task Icone_nao_quadrado_ou_pequeno_400(int largura, int altura, bool aceito)
    {
        var (i, admin) = await Admin();
        var antes = (await f.Chaves()).Count;

        var r = await ImagemTeste.Enviar(admin, "icone", ImagemTeste.Png(largura, altura));

        if (aceito)
        {
            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
            return;
        }
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal(["O ícone deve ser um PNG quadrado de pelo menos 512 px."], Erros(await r.Json(), "arquivo"));
        Assert.Empty(await Linhas(i.Id));
        Assert.Equal(antes, (await f.Chaves()).Count);
    }

    [Fact]
    public async Task Tipo_desconhecido_404()
    {
        var (_, admin) = await Admin();

        Assert.Equal(HttpStatusCode.NotFound, (await ImagemTeste.Enviar(admin, "fundo", ImagemTeste.Png())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync($"{Url}/imagens/fundo")).StatusCode);
    }

    [Fact]
    public async Task Minio_fora_503_sem_mudar_a_imagem()
    {
        var (i, admin) = await Admin();
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());
        var antes = Assert.Single(await Linhas(i.Id));

        HttpResponseMessage r;
        using (f.MinioFora()) r = await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png(tamanho: 90));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode);
        var depois = Assert.Single(await Linhas(i.Id));
        Assert.Equal((antes.Versao, antes.Chave, antes.Hash), (depois.Versao, depois.Chave, depois.Hash));
    }

    [Fact]
    public async Task Remover_imagem_204_e_objeto_fica()
    {
        var (i, admin) = await Admin();
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());
        var chave = Assert.Single(await Linhas(i.Id)).Chave;

        var r = await admin.DeleteAsync($"{Url}/imagens/logo");

        Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);
        var linha = Assert.Single(await Linhas(i.Id));
        Assert.NotNull(linha.RemovidaEm);
        Assert.Contains(chave, await f.Chaves());
        Assert.Equal(JsonValueKind.Null, (await (await admin.GetAsync(Url)).Json()).GetProperty("imagens").GetProperty("logo").ValueKind);
        Assert.Equal(JsonValueKind.Null, (await (await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}")).Json()).GetProperty("imagens").GetProperty("logo").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}/imagens/logo?v=1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync($"{Url}/imagens/logo")).StatusCode);
        var reenvio = await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());
        Assert.Equal(2, (await reenvio.Json()).GetProperty("versao").GetInt32());
    }

    [Fact]
    public async Task Reenviar_depois_de_remover_nao_repete_versao()
    {
        var (i, admin) = await Admin();
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png(tamanho: 80));
        await admin.DeleteAsync($"{Url}/imagens/logo");
        Assert.Equal(HttpStatusCode.NotFound, (await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}/imagens/logo?v=2")).StatusCode);

        var r = await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());

        Assert.Equal(3, (await r.Json()).GetProperty("versao").GetInt32());
        var linha = Assert.Single(await Linhas(i.Id));
        Assert.Null(linha.RemovidaEm);
        Assert.Equal(HttpStatusCode.OK, (await f.Cliente().GetAsync($"/api/instituicoes/{i.Slug}/imagens/logo?v=3")).StatusCode);
    }

    [Fact]
    public async Task Rotas_de_admin_403_e_401()
    {
        var (i, admin) = await Admin();
        var setor = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var clientes = new (string, HttpClient)[]
        {
            ("aluno", (await f.AlunoLogado(i)).Cliente), ("atendente", (await f.Atendente(i, setor)).Cliente), ("anonimo", f.Cliente()),
        };
        HttpRequestMessage[] Pedidos() =>
        [
            new(HttpMethod.Get, Url),
            new(HttpMethod.Put, Url) { Content = JsonContent.Create(Valido()) },
            new(HttpMethod.Post, $"{Url}/imagens/logo") { Content = new MultipartFormDataContent { { new ByteArrayContent(ImagemTeste.Png()), "arquivo", "a.png" } } },
            new(HttpMethod.Delete, $"{Url}/imagens/logo"),
        ];

        foreach (var (quem, cliente) in clientes)
            foreach (var pedido in Pedidos())
            {
                var r = await cliente.SendAsync(pedido);
                Assert.True(r.StatusCode == (quem == "anonimo" ? HttpStatusCode.Unauthorized : HttpStatusCode.Forbidden), $"{quem} {pedido.Method} {pedido.RequestUri}: {(int)r.StatusCode}");
            }
        Assert.Null((await Gravada(i.Id)).NomeCurto);
        Assert.Empty(await Linhas(i.Id));

        await Put(admin, Valido());
        await ImagemTeste.Enviar(admin, "logo", ImagemTeste.Png());
        var (b, adminB) = await Admin();
        var deB = await (await adminB.GetAsync(Url)).Json();
        Assert.Equal(JsonValueKind.Null, deB.GetProperty("nomeCurto").ValueKind);
        Assert.Equal(JsonValueKind.Null, deB.GetProperty("imagens").GetProperty("logo").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await adminB.DeleteAsync($"{Url}/imagens/logo")).StatusCode);
        Assert.Single(await Linhas(i.Id));
        Assert.Empty(await Linhas(b.Id));
    }

    [Fact]
    public async Task Tabelas_da_aparencia()
    {
        string[] colunas = ["nome_curto", "cor", "login_titulo", "login_frase", "login_itens", "assistente_nome", "assistente_boas_vindas", "assistente_perguntas", "contato_horario", "contato_telefone", "contato_email"];
        var anulaveis = await f.Db(null, db => db.Database.SqlQueryRaw<string>(
            "select column_name as \"Value\" from information_schema.columns where table_name = 'instituicao' and is_nullable = 'YES'").ToListAsync());
        Assert.All(colunas, c => Assert.Contains(c, anulaveis));

        var imagem = await f.Db(null, db => db.Database.SqlQueryRaw<string>(
            "select column_name as \"Value\" from information_schema.columns where table_name = 'imagem_instituicao'").ToListAsync());
        Assert.Equal(new[] { "id", "instituicao_id", "tipo", "conteudo", "tamanho", "hash", "chave", "versao", "removida_em" }.Order(), imagem.Order());
        var indice = await f.Db(null, db => db.Database.SqlQueryRaw<string>(
            "select indexdef as \"Value\" from pg_indexes where tablename = 'imagem_instituicao' and indexdef like '%UNIQUE%'").ToListAsync());
        Assert.Contains(indice, d => d.Contains("(instituicao_id, tipo)"));
    }
}
