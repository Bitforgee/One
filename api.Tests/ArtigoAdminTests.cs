using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ArtigoAdminTests(OneFactory f) : IClassFixture<OneFactory>
{
    const string RespostaFaltas = "Faltas não são abonadas, nem com atestado médico. O atestado só justifica a ausência em dia de prova.";

    static object Corpo(long categoriaId, string titulo = "Faltas não são abonadas", string[]? perguntas = null, string resposta = RespostaFaltas, string[]? links = null) =>
        new { titulo, perguntas = perguntas ?? ["posso abonar falta com atestado?"], categoriaId, resposta, links = links ?? ["https://univag.edu.br/estatuto"] };

    async Task<(Instituicao i, HttpClient admin, long categoria)> Preparar()
    {
        var (i, admin) = await Admin.Criar(f);
        return (i, admin, (await f.Categoria(i, "Acadêmico")).Id);
    }

    static async Task<long> Criar(HttpClient admin, long categoria) =>
        (await (await admin.PostAsJsonAsync("/api/admin/artigos", Corpo(categoria))).Json()).GetProperty("id").GetInt64();

    [Fact]
    public async Task Criar_rascunho_versao_1()
    {
        var (_, admin, categoria) = await Preparar();

        var r = await admin.PostAsJsonAsync("/api/admin/artigos", Corpo(categoria));

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await r.Json();
        Assert.Equal("RASCUNHO", j.GetProperty("estado").GetString());
        Assert.Equal(1, j.GetProperty("versao").GetProperty("numero").GetInt32());
        Assert.Equal("Faltas não são abonadas", j.GetProperty("versao").GetProperty("titulo").GetString());
    }

    [Fact]
    public async Task Campo_obrigatorio_faltando_400()
    {
        var (i, admin, categoria) = await Preparar();

        foreach (var corpo in new object[]
        {
            Corpo(categoria, titulo: " "),
            Corpo(categoria, perguntas: []),
            Corpo(categoria, perguntas: [""]),
            Corpo(999999),
            Corpo(categoria, resposta: ""),
        })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/admin/artigos", corpo)).StatusCode);

        Assert.Equal(0, await f.Db(i.Id, db => db.Artigos.CountAsync()));
    }

    [Fact]
    public async Task Link_sem_http_400()
    {
        var (_, admin, categoria) = await Preparar();

        foreach (var link in new[] { "ftp://x", "www.x.com" })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/admin/artigos", Corpo(categoria, links: [link]))).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/artigos", Corpo(categoria, links: ["http://x.com", "https://y.com"]))).StatusCode);
    }

    [Fact]
    public async Task Editar_cria_versao_seguinte()
    {
        var (i, admin, categoria) = await Preparar();
        var id = await Criar(admin, categoria);

        var r = await admin.PutAsJsonAsync($"/api/admin/artigos/{id}", Corpo(categoria, titulo: "Faltas e atestados"));

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(2, (await r.Json()).GetProperty("versao").GetProperty("numero").GetInt32());
        var versoes = await f.Db(i.Id, db => db.VersoesArtigo.Where(v => v.ArtigoId == id).OrderBy(v => v.Numero).ToListAsync());
        Assert.Equal([(1, "Faltas não são abonadas"), (2, "Faltas e atestados")], versoes.Select(v => (v.Numero, v.Titulo)));
        var equipe = await f.Entrar(i, await f.Usuario(i, [Papeis.Atendente]));
        Assert.Equal("Faltas não são abonadas", (await (await equipe.GetAsync($"/api/artigos/versoes/{versoes[0].Id}")).Json()).GetProperty("titulo").GetString());
    }

    [Fact]
    public async Task Numero_de_versao_unico()
    {
        var (i, admin, categoria) = await Preparar();
        var id = await Criar(admin, categoria);

        await Assert.ThrowsAsync<DbUpdateException>(() => f.Db(i.Id, async db =>
        {
            db.VersoesArtigo.Add(new VersaoArtigo { ArtigoId = id, Numero = 1, Titulo = "x", Resposta = "y", CriadaEm = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }));
    }

    static bool CatalogoTem(OneFactory f, string titulo) => f.Llm.Corpos[^1].Contains(titulo);

    [Fact]
    public async Task Ativar_entra_na_proxima_mensagem()
    {
        var (i, admin, categoria) = await Preparar();
        var aluno = await f.AlunoLogado(i);
        var id = await Criar(admin, categoria);
        await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "posso abonar falta?" });
        Assert.False(CatalogoTem(f, "Faltas não são abonadas"));

        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null)).StatusCode);

        await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "posso abonar falta?" });
        Assert.True(CatalogoTem(f, "Faltas não são abonadas"));
    }

    [Fact]
    public async Task Arquivar_sai_da_base_e_mantem_conversas()
    {
        var (i, admin, categoria) = await Preparar();
        var aluno = await f.AlunoLogado(i);
        var id = await Criar(admin, categoria);
        await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null);
        f.Llm.Devolver(Cenario.Resposta("Faltas não são abonadas, mesmo com atestado.", [id], (id, "Faltas não são abonadas, nem com atestado médico")));
        var conversa = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "posso abonar falta?" })).Json()).GetProperty("conversaId").GetInt64();

        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/artigos/{id}/arquivar", null)).StatusCode);

        f.Llm.Devolver(new { tipo = "sem_base", texto = "" });
        await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "posso abonar falta?" });
        Assert.False(CatalogoTem(f, "Faltas não são abonadas"));
        var j = await (await aluno.Cliente.GetAsync($"/api/conversas/{conversa}")).Json();
        Assert.Equal("Faltas não são abonadas, mesmo com atestado.", j.GetProperty("mensagens")[1].GetProperty("texto").GetString());
    }

    [Fact]
    public async Task Ativar_ativo_ou_arquivar_arquivado_409()
    {
        var (_, admin, categoria) = await Preparar();
        var id = await Criar(admin, categoria);
        await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null);

        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null)).StatusCode);
        await admin.PostAsync($"/api/admin/artigos/{id}/arquivar", null);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/api/admin/artigos/{id}/arquivar", null)).StatusCode);
    }

    [Fact]
    public async Task Artigo_inexistente_404()
    {
        var (_, admin, categoria) = await Preparar();

        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync("/api/admin/artigos/999999", Corpo(categoria))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync("/api/admin/artigos/999999/ativar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync("/api/admin/artigos/999999/arquivar", null)).StatusCode);
    }

    [Fact]
    public async Task Listar_200()
    {
        var (_, admin, categoria) = await Preparar();
        var id = await Criar(admin, categoria);
        await admin.PutAsJsonAsync($"/api/admin/artigos/{id}", Corpo(categoria, titulo: "Faltas e atestados"));
        await admin.PostAsync($"/api/admin/artigos/{id}/ativar", null);

        var r = await admin.GetAsync("/api/admin/artigos");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var a = Assert.Single((await r.Json()).EnumerateArray());
        Assert.Equal(("ATIVO", "Acadêmico", 2, "Faltas e atestados"),
            (a.GetProperty("estado").GetString(), a.GetProperty("categoria").GetString(), a.GetProperty("versao").GetProperty("numero").GetInt32(), a.GetProperty("versao").GetProperty("titulo").GetString()));
    }
}
