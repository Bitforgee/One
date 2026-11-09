using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class LiderancaSetorTests(OneFactory f) : IClassFixture<OneFactory>
{
    record Mundo(Instituicao I, HttpClient Admin, Curso Ads);

    async Task<Mundo> Montar()
    {
        var (i, admin) = await Admin.Criar(f);
        var ads = await f.Db(i.Id, async db => { var c = new Curso { Nome = "ADS" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });
        return new Mundo(i, admin, ads);
    }

    static Task<HttpResponseMessage> Criar(HttpClient admin, string nome, object? cursoId = null, object? semestre = null, bool? triagem = null, bool? ativo = null) =>
        admin.PostAsJsonAsync("/api/admin/setores", new { nome, cursoId, semestre, triagem, ativo });

    static async Task Recusa400(HttpResponseMessage r, string campo, string onde)
    {
        Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{onde}: {(int)r.StatusCode}");
        Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), $"{onde}: sem errors.{campo}");
    }

    [Fact]
    public async Task Cria_lideranca_com_curso_e_semestre()
    {
        var m = await Montar();

        var r = await Criar(m.Admin, "Líderes ADS 3º", m.Ads.Id, 3);

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var criado = await r.Json();
        Assert.Equal((m.Ads.Id, 3), (criado.GetProperty("cursoId").GetInt64(), criado.GetProperty("semestre").GetInt32()));
        var id = criado.GetProperty("id").GetInt64();
        var listado = (await (await m.Admin.GetAsync("/api/admin/setores")).Json()).EnumerateArray().Single(s => s.GetProperty("id").GetInt64() == id);
        Assert.Equal((m.Ads.Id, 3), (listado.GetProperty("cursoId").GetInt64(), listado.GetProperty("semestre").GetInt32()));
        var triagem = (await (await m.Admin.GetAsync("/api/admin/setores")).Json()).EnumerateArray().Single(s => s.GetProperty("triagem").GetBoolean());
        Assert.Equal(JsonValueKind.Null, triagem.GetProperty("cursoId").ValueKind);
        Assert.Equal(JsonValueKind.Null, triagem.GetProperty("semestre").ValueKind);
    }

    [Fact]
    public async Task Curso_e_semestre_juntos()
    {
        var m = await Montar();

        await Recusa400(await Criar(m.Admin, "So curso", cursoId: m.Ads.Id), "semestre", "só cursoId");
        await Recusa400(await Criar(m.Admin, "So semestre", semestre: 3), "semestre", "só semestre");
    }

    [Fact]
    public async Task Bordas_e_triagem_400()
    {
        var m = await Montar();
        var outra = await f.Instituicao(nome: "Outra");
        var cursoAlheio = await f.Db(outra.Id, async db => { var c = new Curso { Nome = "Direito" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });

        await Recusa400(await Criar(m.Admin, "Zero", m.Ads.Id, 0), "semestre", "semestre 0");
        await Recusa400(await Criar(m.Admin, "Treze", m.Ads.Id, 13), "semestre", "semestre 13");
        await Recusa400(await Criar(m.Admin, "Alheio", cursoAlheio.Id, 3), "cursoId", "curso de outra instituição");
        await Recusa400(await Criar(m.Admin, "Inexistente", 999_999, 3), "cursoId", "curso inexistente");
        await Recusa400(await Criar(m.Admin, "Triagem", m.Ads.Id, 3, triagem: true), "triagem", "triagem com curso");
        Assert.Equal(HttpStatusCode.Created, (await Criar(m.Admin, "Primeiro", m.Ads.Id, 1)).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Criar(m.Admin, "Doze", m.Ads.Id, 12)).StatusCode);
    }

    [Fact]
    public async Task Uma_lideranca_ativa_por_turma_409()
    {
        var m = await Montar();
        Assert.Equal(HttpStatusCode.Created, (await Criar(m.Admin, "Líderes A", m.Ads.Id, 3)).StatusCode);

        Assert.Equal(HttpStatusCode.Conflict, (await Criar(m.Admin, "Líderes B", m.Ads.Id, 3)).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Criar(m.Admin, "Líderes 4º", m.Ads.Id, 4)).StatusCode);
        var inativa = await Criar(m.Admin, "Líderes B", m.Ads.Id, 3, ativo: false);
        Assert.Equal(HttpStatusCode.Created, inativa.StatusCode);
        var id = (await inativa.Json()).GetProperty("id").GetInt64();

        var reativar = await m.Admin.PutAsJsonAsync($"/api/admin/setores/{id}", new { nome = "Líderes B", ativo = true });

        Assert.Equal(HttpStatusCode.Conflict, reativar.StatusCode);
    }

    [Fact]
    public async Task Atualizar_nao_muda_a_turma()
    {
        var m = await Montar();
        var outro = await f.Db(m.I.Id, async db => { var c = new Curso { Nome = "Direito" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });
        var id = (await (await Criar(m.Admin, "Líderes ADS 3º", m.Ads.Id, 3)).Json()).GetProperty("id").GetInt64();

        var r = await m.Admin.PutAsJsonAsync($"/api/admin/setores/{id}", new { nome = "Líderes renomeados", ativo = true, cursoId = outro.Id, semestre = 7 });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var corpo = await r.Json();
        Assert.Equal(("Líderes renomeados", m.Ads.Id, 3), (corpo.GetProperty("nome").GetString(), corpo.GetProperty("cursoId").GetInt64(), corpo.GetProperty("semestre").GetInt32()));
        var gravado = await f.Db(m.I.Id, db => db.Setores.FindAsync(id).AsTask());
        Assert.Equal((m.Ads.Id, 3), (gravado!.CursoId, gravado.Semestre));
    }

    [Fact]
    public async Task Ninguem_aponta_para_lideranca()
    {
        var m = await Montar();
        var lideranca = await f.Lideranca(m.I, m.Ads, 3, "Líderes ADS 3º");
        var duvida = await f.Categoria(m.I, "Dúvida");
        var fluxo = (await (await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = duvida.Id })).Json()).GetProperty("id").GetInt64();

        var etapa = await m.Admin.PutAsJsonAsync($"/api/admin/fluxos/{fluxo}/rascunho", new { etapas = new[] { new { destino = "SETOR", setorId = (long?)lideranca.Id, prazoHoras = (int?)null, x = (double?)null, y = (double?)null } } });
        await Recusa400(etapa, "setorId", "etapa SETOR");
        await Recusa400(await m.Admin.PostAsJsonAsync("/api/admin/cursos", new { nome = "Direito", setorCoordenacaoId = lideranca.Id }), "setorCoordenacaoId", "criar curso");
        await Recusa400(await m.Admin.PutAsJsonAsync($"/api/admin/cursos/{m.Ads.Id}", new { nome = "ADS", setorCoordenacaoId = lideranca.Id }), "setorCoordenacaoId", "alterar curso");

        var balcao = await Balcao.Criar(f);
        var cursoDoAluno = await f.Db(balcao.Instituicao.Id, db => db.Cursos.SingleAsync());
        var deles = await f.Lideranca(balcao.Instituicao, cursoDoAluno, 3, "Líderes");
        var numero = await balcao.Chamado();
        var encaminhar = await balcao.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = deles.Id, motivo = "Passa para a turma" });
        await Recusa400(encaminhar, "setorId", "encaminhar");
    }
}
