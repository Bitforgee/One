using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class LiderancaDestinoTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<bool> Prevista(Turma t) => (await t.Destino(await t.Conversa())).GetProperty("lideranca").GetBoolean();

    [Fact]
    public async Task Disponibilidade_da_lideranca()
    {
        Assert.True(await Prevista(await Turma.Criar(f)));
        Assert.False(await Prevista(await Turma.Criar(f, liderancaAtiva: false)));
        Assert.False(await Prevista(await Turma.Criar(f, comLider: false)));

        var soOAluno = await Turma.Criar(f, comLider: false);
        await f.Db(soOAluno.I.Id, db => db.VincularSetores(soOAluno.Aluno.Usuario.Id, soOAluno.Lideranca!.Id));
        Assert.False(await Prevista(soOAluno));

        var inativo = await Turma.Criar(f);
        await f.Db(inativo.I.Id, db => db.Usuarios.Where(u => u.Id == inativo.Lider!.Usuario.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        Assert.False(await Prevista(inativo));

        var comColega = await Turma.Criar(f);
        await f.Db(comColega.I.Id, db => db.VincularSetores(comColega.Aluno.Usuario.Id, comColega.Lideranca!.Id));
        Assert.True(await Prevista(comColega));
    }

    [Fact]
    public async Task Destino_informa_sem_gravar()
    {
        var t = await Turma.Criar(f);
        var conversa = await t.Conversa();
        var chamadosAntes = await f.Db(t.I.Id, db => db.Chamados.CountAsync());
        f.Gravacoes.Zerar();

        var corpo = await t.Destino(conversa);

        Assert.True(corpo.GetProperty("lideranca").GetBoolean());
        Assert.Equal(0, f.Gravacoes.Total);
        Assert.Equal(chamadosAntes, await f.Db(t.I.Id, db => db.Chamados.CountAsync()));
        Assert.Null(await f.Db(t.I.Id, db => db.Conversas.Where(c => c.Id == conversa).Select(c => c.Desfecho).SingleAsync()));

        var semLideranca = await Turma.Criar(f);
        var coordenacao = await f.Categoria(semLideranca.I, "Coordenação");
        await f.Fluxo(semLideranca.I, coordenacao, semLideranca.Curso.Id, Turma.Semestre, SementeAtendimento.Etapa(DestinosEtapa.CoordenacaoCurso));
        Assert.False((await semLideranca.Destino(await semLideranca.Conversa(categoria: coordenacao))).GetProperty("lideranca").GetBoolean());
        var padrao = await f.Db(semLideranca.I.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        Assert.False((await semLideranca.Destino(await semLideranca.Conversa(categoria: padrao))).GetProperty("lideranca").GetBoolean());
        var matricula = await f.Db(t.I.Id, db => db.Matriculas.Where(m => m.UsuarioId == t.Aluno.Usuario.Id).Select(m => m.Id).SingleAsync());
        Assert.True((await t.Destino(conversa, matriculaId: matricula)).GetProperty("lideranca").GetBoolean());
    }

    [Fact]
    public async Task Destino_400_404_409()
    {
        var t = await Turma.Criar(f);
        var conversa = await t.Conversa();
        var outro = await f.AlunoLogado(t.I);
        var matriculaDoOutro = await f.Db(t.I.Id, db => db.Matriculas.Where(m => m.UsuarioId == outro.Usuario.Id).Select(m => m.Id).SingleAsync());

        Assert.Equal(HttpStatusCode.BadRequest, (await t.ClienteAluno.GetAsync($"/api/conversas/{conversa}/destino?matriculaId={matriculaDoOutro}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outro.Cliente.GetAsync($"/api/conversas/{conversa}/destino")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t.ClienteAluno.GetAsync("/api/conversas/999999/destino")).StatusCode);

        var recusada = await t.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { matriculaId = matriculaDoOutro });
        Assert.Equal(HttpStatusCode.BadRequest, recusada.StatusCode);
        Assert.True((await recusada.Json()).GetProperty("errors").TryGetProperty("matriculaId", out _));
        Assert.Equal(HttpStatusCode.NotFound, (await outro.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).StatusCode);

        Assert.Equal(HttpStatusCode.Created, (await t.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t.ClienteAluno.GetAsync($"/api/conversas/{conversa}/destino")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { })).StatusCode);
    }

    [Fact]
    public async Task Fluxo_decide_e_o_aluno_nao_escolhe()
    {
        var t = await Turma.Criar(f);

        var recusou = await t.Ler(await t.Transferir(new { aceitaLideranca = false }));
        var omitiu = await t.Ler(await t.Transferir(new { }));

        foreach (var chamado in new[] { recusou, omitiu }) Assert.Equal((t.Lideranca!.Id, 1), (chamado.SetorId, chamado.EtapaOrdem));
    }

    [Fact]
    public async Task Atendimento_direto_nao_passa_pela_lideranca()
    {
        var t = await Turma.Criar(f);

        var r = await t.ClienteAluno.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "Preciso falar com alguém sobre minha matrícula" });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var chamado = await t.Ler((await r.Json()).GetProperty("numero").GetString()!);
        Assert.NotEqual(t.Lideranca!.Id, chamado.SetorId);
    }

    [Fact]
    public async Task Sem_lideranca_disponivel_vai_a_coordenacao()
    {
        var t = await Turma.Criar(f, comLider: false);

        var chamado = await t.Ler(await t.Transferir());

        Assert.Equal((t.Coordenacao.Id, 2), (chamado.SetorId, chamado.EtapaOrdem));
    }
}
