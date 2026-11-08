using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Tests.Infra.SementeAtendimento;

namespace One.Api.Tests;

// fluxos-atendimento S2 (C34 a C36): o simulador usa a mesma resolução da transferência e não grava nada.
public class FluxoSimulacaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    record Mundo(Instituicao I, HttpClient Admin, Categoria Duvida, Curso Ads, Curso Direito, Setor Financeiro, Setor Biblioteca, Setor CoordAds);

    async Task<Mundo> Montar()
    {
        var (i, admin) = await Admin.Criar(f);
        var coordAds = await f.Setor(i, "Coordenação ADS");
        var (ads, direito) = await f.Db(i.Id, async db =>
        {
            var a = new Curso { Nome = "ADS", SetorCoordenacaoId = coordAds.Id };
            var d = new Curso { Nome = "Direito" }; // sem coordenação
            db.Cursos.AddRange(a, d);
            await db.SaveChangesAsync();
            return (a, d);
        });
        return new Mundo(i, admin, await f.Categoria(i, "Dúvida"), ads, direito, await f.Setor(i, "Financeiro"), await f.Setor(i, "Biblioteca"), coordAds);
    }

    static Task<HttpResponseMessage> Simular(HttpClient admin, long fluxo, string versao, long cursoId, int semestre, bool aceita = false) =>
        admin.PostAsJsonAsync($"/api/admin/fluxos/{fluxo}/simular", new { versao, cursoId, semestre, aceitaLideranca = aceita });

    async Task<int[]> Contagens(Mundo m) => await f.Db(m.I.Id, async db =>
        new[] { await db.Chamados.CountAsync(), await db.Fluxos.CountAsync(), await db.VersoesFluxo.CountAsync(), await db.EtapasFluxo.CountAsync() });

    // C34
    [Fact]
    public async Task Simula_sem_gravar()
    {
        var m = await Montar();
        var fluxo = await f.Fluxo(m.I, m.Duvida, m.Ads.Id, 3, Etapa(DestinosEtapa.Setor, m.Financeiro.Id, prazoHoras: 24), Etapa(DestinosEtapa.CoordenacaoCurso));
        var antes = await Contagens(m);

        var r = await Simular(m.Admin, fluxo.Id, "VIGENTE", m.Ads.Id, 3);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Json();
        var etapas = j.GetProperty("etapas").EnumerateArray().ToList();
        Assert.Equal([(1, "SETOR", "Financeiro", "RESOLVIDA"), (2, "COORDENACAO_CURSO", "Coordenação ADS", "RESOLVIDA")],
            etapas.Select(e => (e.GetProperty("ordem").GetInt32(), e.GetProperty("destino").GetString(), e.GetProperty("setor").GetString(), e.GetProperty("situacao").GetString())));
        Assert.Equal("Financeiro", j.GetProperty("inicial").GetString());
        var escolhido = j.GetProperty("escolhido");
        Assert.Equal((fluxo.Id, m.Ads.Id, 3), (escolhido.GetProperty("id").GetInt64(), escolhido.GetProperty("cursoId").GetInt64(), escolhido.GetProperty("semestre").GetInt32()));
        Assert.Equal(antes, await Contagens(m));
    }

    [Fact]
    public async Task Simula_o_rascunho_e_recusa_versao_que_nao_existe()
    {
        var m = await Montar();
        var fluxo = await f.Fluxo(m.I, m.Duvida, null, null, false, Etapa(DestinosEtapa.Setor, m.Biblioteca.Id));

        var rascunho = await Simular(m.Admin, fluxo.Id, "RASCUNHO", m.Ads.Id, 1);
        var vigente = await Simular(m.Admin, fluxo.Id, "VIGENTE", m.Ads.Id, 1);

        Assert.Equal(HttpStatusCode.OK, rascunho.StatusCode);
        var j = await rascunho.Json();
        Assert.Equal("Biblioteca", j.GetProperty("inicial").GetString());
        Assert.Equal(JsonValueKind.Null, j.GetProperty("escolhido").ValueKind); // sem versão publicada o roteamento real não usa o fluxo
        Assert.Equal(HttpStatusCode.BadRequest, vigente.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Simular(m.Admin, fluxo.Id, "OUTRA", m.Ads.Id, 1)).StatusCode);
    }

    // C35
    [Fact]
    public async Task Etapa_nao_resolvida_com_motivo()
    {
        var m = await Montar();
        var fluxo = await f.Fluxo(m.I, m.Duvida, null, null, Etapa(DestinosEtapa.LiderancaSemestre), Etapa(DestinosEtapa.CoordenacaoCurso), Etapa(DestinosEtapa.Setor, m.Biblioteca.Id));

        // Direito não tem coordenação, e nenhuma liderança existe
        var j = await (await Simular(m.Admin, fluxo.Id, "VIGENTE", m.Direito.Id, 2, aceita: true)).Json();

        var etapas = j.GetProperty("etapas").EnumerateArray().ToList();
        Assert.Equal([("NAO_RESOLVIDA", "Sem liderança disponível", (string?)null), ("NAO_RESOLVIDA", "Curso sem coordenação", null), ("RESOLVIDA", null, "Biblioteca")],
            etapas.Select(e => (e.GetProperty("situacao").GetString()!, e.GetProperty("motivo").GetString(), e.GetProperty("setor").GetString())));
        Assert.Equal("Biblioteca", j.GetProperty("inicial").GetString());
    }

    // C36
    [Fact]
    public async Task Simulacao_igual_a_transferencia_real()
    {
        var m = await Montar();
        await f.Fluxo(m.I, m.Duvida, null, null, Etapa(DestinosEtapa.CoordenacaoCurso), Etapa(DestinosEtapa.Setor, m.Financeiro.Id));
        await f.Fluxo(m.I, m.Duvida, m.Ads.Id, null, Etapa(DestinosEtapa.CoordenacaoCurso));
        await f.Fluxo(m.I, m.Duvida, m.Ads.Id, 3, Etapa(DestinosEtapa.Setor, m.Biblioteca.Id), Etapa(DestinosEtapa.CoordenacaoCurso));
        var todos = await f.Db(m.I.Id, db => db.Fluxos.SingleAsync(x => x.CursoId == null));
        var alunos = new (Curso curso, int semestre)[] { (m.Ads, 3), (m.Ads, 5), (m.Ads, 1), (m.Direito, 3), (m.Direito, 12), (m.Direito, 1) };

        foreach (var (curso, semestre) in alunos)
        {
            var aluno = await f.AlunoLogado(m.I);
            await f.Db(m.I.Id, db => db.Matriculas.Where(x => x.UsuarioId == aluno.Usuario.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.CursoId, curso.Id).SetProperty(x => x.Semestre, semestre)));

            // o fluxo que o roteamento real usaria, e o que a simulação dele devolve como setor inicial
            var escolhido = (await (await Simular(m.Admin, todos.Id, "VIGENTE", curso.Id, semestre)).Json()).GetProperty("escolhido").GetProperty("id").GetInt64();
            var inicial = (await (await Simular(m.Admin, escolhido, "VIGENTE", curso.Id, semestre)).Json()).GetProperty("inicial").GetString();
            f.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?", categoriaId = m.Duvida.Id });
            var conversa = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "ajuda" })).Json()).GetProperty("conversaId").GetInt64();
            var real = (await (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).Json()).GetProperty("setor").GetString();

            Assert.Equal(real, inicial);
        }
    }
}
