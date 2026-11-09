using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class FluxoAdminTests(OneFactory f) : IClassFixture<OneFactory>
{
    record Mundo(Instituicao I, HttpClient Admin, Categoria Duvida, Setor Financeiro, Setor Secretaria, Curso Ads);

    async Task<Mundo> Montar()
    {
        var (i, admin) = await Admin.Criar(f);
        var ads = await f.Db(i.Id, async db => { var c = new Curso { Nome = "ADS" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });
        return new Mundo(i, admin, await f.Categoria(i, "Dúvida"), await f.Setor(i, "Financeiro"), await f.Setor(i, "Secretaria"), ads);
    }

    static object E(string destino, long? setorId = null, int? prazoHoras = null, double? x = null, double? y = null) => new { destino, setorId, prazoHoras, x, y };

    static async Task<long> Criar(HttpClient admin, object corpo)
    {
        var r = await admin.PostAsJsonAsync("/api/admin/fluxos", corpo);
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return (await r.Json()).GetProperty("id").GetInt64();
    }

    static Task<HttpResponseMessage> Salvar(HttpClient admin, long id, params object[] etapas) =>
        admin.PutAsJsonAsync($"/api/admin/fluxos/{id}/rascunho", new { etapas });

    static async Task Recusa400(HttpResponseMessage r, string campo, string onde)
    {
        Assert.True(r.StatusCode == HttpStatusCode.BadRequest, $"{onde}: {(int)r.StatusCode}");
        Assert.True((await r.Json()).GetProperty("errors").TryGetProperty(campo, out _), $"{onde}: sem errors.{campo}");
    }

    static async Task<JsonElement> Listado(HttpClient admin, long id)
    {
        var lista = await (await admin.GetAsync("/api/admin/fluxos")).Json();
        return lista.EnumerateArray().Single(x => x.GetProperty("id").GetInt64() == id);
    }

    [Fact]
    public async Task Cria_fluxo_nas_tres_abrangencias()
    {
        var m = await Montar();
        foreach (var (corpo, curso, semestre) in new (object, long?, int?)[]
        {
            (new { categoriaId = m.Duvida.Id }, null, null),
            (new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id }, m.Ads.Id, null),
            (new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id, semestre = 3 }, m.Ads.Id, 3),
        })
        {
            var r = await m.Admin.PostAsJsonAsync("/api/admin/fluxos", corpo);

            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            var j = await r.Json();
            Assert.Equal(m.Duvida.Id, j.GetProperty("categoriaId").GetInt64());
            Assert.Equal(curso, j.GetProperty("cursoId").ValueKind == JsonValueKind.Null ? (long?)null : j.GetProperty("cursoId").GetInt64());
            Assert.Equal(semestre, j.GetProperty("semestre").ValueKind == JsonValueKind.Null ? (int?)null : j.GetProperty("semestre").GetInt32());
            Assert.Equal(JsonValueKind.Null, j.GetProperty("vigente").ValueKind);
            Assert.Equal(JsonValueKind.Null, j.GetProperty("rascunho").ValueKind);
        }
        Assert.Equal(3, await f.Db(m.I.Id, db => db.Fluxos.CountAsync()));
        Assert.Equal(0, await f.Db(m.I.Id, db => db.VersoesFluxo.CountAsync()));
    }

    [Fact]
    public async Task Semestre_so_com_curso_e_de_1_a_12()
    {
        var m = await Montar();

        await Recusa400(await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id, semestre = 3 }), "semestre", "semestre sem curso");
        foreach (var semestre in new[] { 0, 13 })
            await Recusa400(await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id, semestre }), "semestre", $"semestre {semestre}");
        foreach (var semestre in new[] { 1, 12 })
            Assert.Equal(HttpStatusCode.Created, (await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id, semestre })).StatusCode);
        Assert.Equal(2, await f.Db(m.I.Id, db => db.Fluxos.CountAsync()));
    }

    [Fact]
    public async Task Curso_de_outra_instituicao_400()
    {
        var m = await Montar();
        var outra = await f.Instituicao();
        var cursoAlheio = await f.Db(outra.Id, async db => { var c = new Curso { Nome = "Medicina" }; db.Cursos.Add(c); await db.SaveChangesAsync(); return c; });

        await Recusa400(await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id, cursoId = cursoAlheio.Id }), "cursoId", "curso de outra instituição");
        await Recusa400(await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id, cursoId = 999999 }), "cursoId", "curso inexistente");
        Assert.Equal(0, await f.Db(m.I.Id, db => db.Fluxos.CountAsync()));
    }

    [Fact]
    public async Task Categoria_padrao_ou_inexistente_400()
    {
        var m = await Montar();
        var padrao = await f.Db(m.I.Id, db => db.Categorias.SingleAsync(c => c.Padrao));

        await Recusa400(await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = padrao.Id }), "categoriaId", "categoria padrão");
        await Recusa400(await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = 999999 }), "categoriaId", "categoria inexistente");
    }

    [Fact]
    public async Task Abrangencia_repetida_409()
    {
        var m = await Montar();
        await Criar(m.Admin, new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id, semestre = 3 });

        var repetido = await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id, semestre = 3 });
        var outroSemestre = await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id, semestre = 4 });

        Assert.Equal(HttpStatusCode.Conflict, repetido.StatusCode);
        Assert.Equal(HttpStatusCode.Created, outroSemestre.StatusCode);
        await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        Assert.Equal(HttpStatusCode.Conflict, (await m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id })).StatusCode);
    }

    [Fact]
    public async Task Criacao_simultanea_uma_so()
    {
        var m = await Montar();

        var respostas = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => m.Admin.PostAsJsonAsync("/api/admin/fluxos", new { categoriaId = m.Duvida.Id })));

        Assert.Equal([HttpStatusCode.Created, HttpStatusCode.Conflict], respostas.Select(r => r.StatusCode).Order());
        Assert.Equal(1, await f.Db(m.I.Id, db => db.Fluxos.CountAsync()));
    }

    [Fact]
    public async Task Rascunho_e_substituido_inteiro()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });

        var primeiro = await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, 24), E("SETOR", m.Secretaria.Id, 48), E("COORDENACAO_CURSO"));
        var segundo = await Salvar(m.Admin, id, E("COORDENACAO_CURSO", prazoHoras: 12), E("SETOR", m.Financeiro.Id));

        Assert.Equal(HttpStatusCode.OK, primeiro.StatusCode);
        Assert.Equal(3, (await primeiro.Json()).GetProperty("etapas").GetArrayLength());
        Assert.Equal(HttpStatusCode.OK, segundo.StatusCode);
        var etapas = (await segundo.Json()).GetProperty("etapas").EnumerateArray().ToList();
        Assert.Equal(["COORDENACAO_CURSO", "SETOR"], etapas.Select(e => e.GetProperty("destino").GetString()));
        var gravadas = await f.Db(m.I.Id, db => db.EtapasFluxo.OrderBy(e => e.Ordem).ToListAsync());
        Assert.Equal([(1, "COORDENACAO_CURSO", (int?)12), (2, "SETOR", null)], gravadas.Select(e => (e.Ordem, e.Destino, e.PrazoHoras)));
        Assert.Equal(1, await f.Db(m.I.Id, db => db.VersoesFluxo.CountAsync()));
    }

    [Fact]
    public async Task Etapas_de_1_a_5()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        var coordenacao = E("COORDENACAO_CURSO");

        await Recusa400(await Salvar(m.Admin, id), "etapas", "0 etapas");
        await Recusa400(await Salvar(m.Admin, id, [.. Enumerable.Repeat(coordenacao, 6)]), "etapas", "6 etapas");
        Assert.Equal(HttpStatusCode.OK, (await Salvar(m.Admin, id, coordenacao)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Salvar(m.Admin, id, [.. Enumerable.Repeat(coordenacao, 5)])).StatusCode);
        Assert.Equal(5, await f.Db(m.I.Id, db => db.EtapasFluxo.CountAsync()));
    }

    [Fact]
    public async Task Destino_desconhecido_400()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });

        await Recusa400(await Salvar(m.Admin, id, E("COORDENACAO")), "destino", "destino desconhecido");
        await Recusa400(await Salvar(m.Admin, id, E("setor", m.Financeiro.Id)), "destino", "destino em minúsculas");
        await Recusa400(await Salvar(m.Admin, id, new { setorId = m.Financeiro.Id }), "destino", "destino ausente");
        Assert.Equal(0, await f.Db(m.I.Id, db => db.VersoesFluxo.CountAsync()));
    }

    [Fact]
    public async Task Setor_da_etapa_invalido_400()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        var alheio = await f.Setor(await f.Instituicao(), "Alheio");
        var inativo = await f.Setor(m.I, "Antigo");
        await f.Db(m.I.Id, db => db.Setores.Where(s => s.Id == inativo.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Ativo, false)));
        var coordenacao = E("COORDENACAO_CURSO");

        await Recusa400(await Salvar(m.Admin, id, E("SETOR"), coordenacao), "setorId", "sem setor");
        await Recusa400(await Salvar(m.Admin, id, E("SETOR", 999999), coordenacao), "setorId", "setor inexistente");
        await Recusa400(await Salvar(m.Admin, id, E("SETOR", alheio.Id), coordenacao), "setorId", "setor de outra instituição");
        await Recusa400(await Salvar(m.Admin, id, E("SETOR", inativo.Id), coordenacao), "setorId", "setor inativo");
        Assert.Equal(HttpStatusCode.OK, (await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id), coordenacao)).StatusCode);
    }

    [Fact]
    public async Task Setor_so_na_etapa_de_setor()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });

        await Recusa400(await Salvar(m.Admin, id, E("COORDENACAO_CURSO", m.Financeiro.Id)), "setorId", "coordenação com setor");
        await Recusa400(await Salvar(m.Admin, id, E("LIDERANCA_SEMESTRE", m.Financeiro.Id), E("COORDENACAO_CURSO")), "setorId", "liderança com setor");
    }

    [Fact]
    public async Task Prazo_de_1_a_720_e_nunca_na_ultima()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        var fim = E("COORDENACAO_CURSO");

        foreach (var horas in new[] { 0, 721 })
            await Recusa400(await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, horas), fim), "prazoHoras", $"prazo {horas}");
        foreach (var horas in new[] { 1, 720 })
            Assert.Equal(HttpStatusCode.OK, (await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, horas), fim)).StatusCode);
        await Recusa400(await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, 24)), "prazoHoras", "prazo na única etapa");
        await Recusa400(await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id), E("COORDENACAO_CURSO", prazoHoras: 24)), "prazoHoras", "prazo na última etapa");
    }

    [Fact]
    public async Task Lideranca_so_na_primeira_e_nunca_a_ultima()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        var lideranca = E("LIDERANCA_SEMESTRE");

        await Recusa400(await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id), lideranca), "destino", "liderança em segundo");
        await Recusa400(await Salvar(m.Admin, id, lideranca), "destino", "liderança única");
        await Recusa400(await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id), lideranca, E("COORDENACAO_CURSO")), "destino", "liderança no meio");
        Assert.Equal(HttpStatusCode.OK, (await Salvar(m.Admin, id, lideranca, E("COORDENACAO_CURSO"))).StatusCode);
    }

    [Fact]
    public async Task Posicao_x_y_juntas_e_devolvidas()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        var fim = E("COORDENACAO_CURSO");

        await Recusa400(await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, x: 10), fim), "etapas", "x sem y");
        await Recusa400(await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, y: 10), fim), "etapas", "y sem x");
        var ok = await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, x: 120.5, y: -40), E("COORDENACAO_CURSO", x: 360, y: 0));

        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var rascunho = (await Listado(m.Admin, id)).GetProperty("rascunho").GetProperty("etapas").EnumerateArray().ToList();
        Assert.Equal([(120.5, -40.0), (360.0, 0.0)], rascunho.Select(e => (e.GetProperty("x").GetDouble(), e.GetProperty("y").GetDouble())));
    }

    [Fact]
    public async Task Publicar_numera_e_remove_o_rascunho()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id));

        var v1 = await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null);
        var depoisDeV1 = await Listado(m.Admin, id);
        await Salvar(m.Admin, id, E("SETOR", m.Secretaria.Id));
        var v2 = await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null);

        Assert.Equal(HttpStatusCode.Created, v1.StatusCode);
        Assert.Equal(1, (await v1.Json()).GetProperty("numero").GetInt32());
        Assert.Equal(JsonValueKind.Null, depoisDeV1.GetProperty("rascunho").ValueKind);
        Assert.Equal(1, depoisDeV1.GetProperty("vigente").GetProperty("numero").GetInt32());
        Assert.Equal(HttpStatusCode.Created, v2.StatusCode);
        Assert.Equal(2, (await v2.Json()).GetProperty("numero").GetInt32());
        var depoisDeV2 = await Listado(m.Admin, id);
        Assert.Equal(JsonValueKind.Null, depoisDeV2.GetProperty("rascunho").ValueKind);
        Assert.Equal(2, depoisDeV2.GetProperty("vigente").GetProperty("numero").GetInt32());
    }

    [Fact]
    public async Task Publicar_sem_rascunho_409()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });

        Assert.Equal(HttpStatusCode.Conflict, (await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null)).StatusCode);
        await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id));
        Assert.Equal(HttpStatusCode.Created, (await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null)).StatusCode);
    }

    [Fact]
    public async Task Publicacao_simultanea_uma_so()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id));

        var respostas = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null)));

        Assert.Equal([HttpStatusCode.Created, HttpStatusCode.Conflict], respostas.Select(r => r.StatusCode).Order());
        Assert.Equal(1, await f.Db(m.I.Id, db => db.VersoesFluxo.CountAsync(v => v.PublicadaEm != null)));
    }

    [Fact]
    public async Task Versao_antiga_e_chamado_nao_mudam()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id));
        await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null);
        var aluno = await f.AlunoLogado(m.I);
        f.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?", categoriaId = m.Duvida.Id });
        var conversa = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "ajuda" })).Json()).GetProperty("conversaId").GetInt64();
        var numero = (await (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).Json()).GetProperty("numero").GetString();
        var antes = await f.Db(m.I.Id, db => db.Chamados.SingleAsync(c => c.Numero == numero));

        await Salvar(m.Admin, id, E("SETOR", m.Secretaria.Id), E("COORDENACAO_CURSO"));
        Assert.Equal(HttpStatusCode.Created, (await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null)).StatusCode);

        var v1 = await f.Db(m.I.Id, db => db.VersoesFluxo.Include(v => v.Etapas).SingleAsync(v => v.Numero == 1));
        Assert.Equal([(1, m.Financeiro.Id)], v1.Etapas.Select(e => (e.Ordem, e.SetorId!.Value)));
        var depois = await f.Db(m.I.Id, db => db.Chamados.SingleAsync(c => c.Numero == numero));
        Assert.Equal((v1.Id, 1), (depois.VersaoFluxoId, depois.EtapaOrdem));
        Assert.Equal((antes.SetorId, antes.EtapaDesde), (depois.SetorId, depois.EtapaDesde));
    }

    [Fact]
    public async Task Descartar_rascunho()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        Assert.Equal(HttpStatusCode.NotFound, (await m.Admin.DeleteAsync($"/api/admin/fluxos/{id}/rascunho")).StatusCode);
        await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id));
        await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null);
        await Salvar(m.Admin, id, E("SETOR", m.Secretaria.Id));

        var descartado = await m.Admin.DeleteAsync($"/api/admin/fluxos/{id}/rascunho");

        Assert.Equal(HttpStatusCode.NoContent, descartado.StatusCode);
        var fluxo = await Listado(m.Admin, id);
        Assert.Equal(JsonValueKind.Null, fluxo.GetProperty("rascunho").ValueKind);
        Assert.Equal(1, fluxo.GetProperty("vigente").GetProperty("numero").GetInt32());
        Assert.Equal(1, await f.Db(m.I.Id, db => db.VersoesFluxo.CountAsync()));
        Assert.Equal(1, await f.Db(m.I.Id, db => db.EtapasFluxo.CountAsync()));
        Assert.Equal(HttpStatusCode.NotFound, (await m.Admin.DeleteAsync($"/api/admin/fluxos/{id}/rascunho")).StatusCode);
    }

    [Fact]
    public async Task Simular_400_e_id_desconhecido_404()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id });
        await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id));
        await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null);
        var simular = $"/api/admin/fluxos/{id}/simular";

        await Recusa400(await m.Admin.PostAsJsonAsync(simular, new { versao = "VIGENTE", cursoId = m.Ads.Id, semestre = 0 }), "semestre", "semestre 0");
        await Recusa400(await m.Admin.PostAsJsonAsync(simular, new { versao = "VIGENTE", cursoId = m.Ads.Id, semestre = 13 }), "semestre", "semestre 13");
        await Recusa400(await m.Admin.PostAsJsonAsync(simular, new { versao = "VIGENTE", cursoId = 999999, semestre = 3 }), "cursoId", "curso inexistente");
        Assert.Equal(HttpStatusCode.OK, (await m.Admin.PostAsJsonAsync(simular, new { versao = "VIGENTE", cursoId = m.Ads.Id, semestre = 12 })).StatusCode);

        var outra = await f.Instituicao();
        var alheio = await f.Fluxo(outra, await f.Categoria(outra, "Alheia"), null, null, SementeAtendimento.Etapa(DestinosEtapa.CoordenacaoCurso));
        foreach (var desconhecido in new long[] { 999999, alheio.Id })
        {
            var rota = $"/api/admin/fluxos/{desconhecido}";
            Assert.Equal(HttpStatusCode.NotFound, (await Salvar(m.Admin, desconhecido, E("COORDENACAO_CURSO"))).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await m.Admin.DeleteAsync($"{rota}/rascunho")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await m.Admin.PostAsync($"{rota}/publicar", null)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await m.Admin.PostAsJsonAsync($"{rota}/simular", new { versao = "VIGENTE", cursoId = m.Ads.Id, semestre = 3 })).StatusCode);
        }
    }

    [Fact]
    public async Task Lista_so_da_instituicao()
    {
        var m = await Montar();
        var id = await Criar(m.Admin, new { categoriaId = m.Duvida.Id, cursoId = m.Ads.Id, semestre = 3 });
        await Salvar(m.Admin, id, E("SETOR", m.Financeiro.Id, 24, 5, 6), E("COORDENACAO_CURSO"));
        await m.Admin.PostAsync($"/api/admin/fluxos/{id}/publicar", null);
        await Salvar(m.Admin, id, E("COORDENACAO_CURSO"));
        var outra = await f.Instituicao();
        await f.Fluxo(outra, await f.Categoria(outra, "Alheia"), null, null, SementeAtendimento.Etapa(DestinosEtapa.CoordenacaoCurso));

        var r = await m.Admin.GetAsync("/api/admin/fluxos");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var fluxo = Assert.Single((await r.Json()).EnumerateArray());
        Assert.Equal((id, m.Duvida.Id, m.Ads.Id, 3), (fluxo.GetProperty("id").GetInt64(), fluxo.GetProperty("categoriaId").GetInt64(), fluxo.GetProperty("cursoId").GetInt64(), fluxo.GetProperty("semestre").GetInt32()));
        var vigente = fluxo.GetProperty("vigente");
        Assert.Equal(1, vigente.GetProperty("numero").GetInt32());
        var primeira = vigente.GetProperty("etapas")[0];
        Assert.Equal(("SETOR", m.Financeiro.Id, 24, 5, 6), (primeira.GetProperty("destino").GetString(), primeira.GetProperty("setorId").GetInt64(), primeira.GetProperty("prazoHoras").GetInt32(),
            primeira.GetProperty("x").GetInt32(), primeira.GetProperty("y").GetInt32()));
        Assert.Equal(2, vigente.GetProperty("etapas").GetArrayLength());
        var rascunho = fluxo.GetProperty("rascunho");
        Assert.Equal(2, rascunho.GetProperty("numero").GetInt32());
        Assert.Equal(1, rascunho.GetProperty("etapas").GetArrayLength());
    }
}
