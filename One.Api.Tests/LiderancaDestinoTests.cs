using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// fluxos-atendimento C67 a C69 e C72 (door 6): a liderança só recebe o chamado com o aceite do aluno, e o aluno é avisado antes.
public class LiderancaDestinoTests(OneFactory f) : IClassFixture<OneFactory>
{
    async Task<bool> Prevista(Turma t) => (await t.Destino(await t.Conversa())).GetProperty("lideranca").GetBoolean();

    // C67: setor ativo e ao menos um atendente ativo que não é o aluno
    [Fact]
    public async Task Disponibilidade_da_lideranca()
    {
        Assert.True(await Prevista(await Turma.Criar(f)));
        Assert.False(await Prevista(await Turma.Criar(f, liderancaAtiva: false)));
        Assert.False(await Prevista(await Turma.Criar(f, comLider: false)));

        var soOAluno = await Turma.Criar(f, comLider: false);
        await f.Db(soOAluno.I.Id, async db => { db.AtendenteSetores.Add(new AtendenteSetor { UsuarioId = soOAluno.Aluno.Usuario.Id, SetorId = soOAluno.Lideranca!.Id }); await db.SaveChangesAsync(); });
        Assert.False(await Prevista(soOAluno));

        // um atendente desativado também não conta
        var inativo = await Turma.Criar(f);
        await f.Db(inativo.I.Id, db => db.Usuarios.Where(u => u.Id == inativo.Lider!.Usuario.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));
        Assert.False(await Prevista(inativo));

        // com o aluno e um colega atendendo, a liderança segue disponível
        var comColega = await Turma.Criar(f);
        await f.Db(comColega.I.Id, async db => { db.AtendenteSetores.Add(new AtendenteSetor { UsuarioId = comColega.Aluno.Usuario.Id, SetorId = comColega.Lideranca!.Id }); await db.SaveChangesAsync(); });
        Assert.True(await Prevista(comColega));
    }

    // C68
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

        // fluxo que não começa pela liderança, categoria sem fluxo e a matrícula escolhida
        var semLideranca = await Turma.Criar(f);
        var coordenacao = await f.Categoria(semLideranca.I, "Coordenação");
        await f.Fluxo(semLideranca.I, coordenacao, semLideranca.Curso.Id, Turma.Semestre, SementeAtendimento.Etapa(DestinosEtapa.CoordenacaoCurso));
        Assert.False((await semLideranca.Destino(await semLideranca.Conversa(categoria: coordenacao))).GetProperty("lideranca").GetBoolean());
        var padrao = await f.Db(semLideranca.I.Id, db => db.Categorias.SingleAsync(c => c.Padrao));
        Assert.False((await semLideranca.Destino(await semLideranca.Conversa(categoria: padrao))).GetProperty("lideranca").GetBoolean());
        var matricula = await f.Db(t.I.Id, db => db.Matriculas.Where(m => m.UsuarioId == t.Aluno.Usuario.Id).Select(m => m.Id).SingleAsync());
        Assert.True((await t.Destino(conversa, matriculaId: matricula)).GetProperty("lideranca").GetBoolean());
    }

    // C69
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

        // POST /transferir: matrícula que não é do aluno 400 (campo matriculaId); conversa de outro aluno 404
        var recusada = await t.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { matriculaId = matriculaDoOutro });
        Assert.Equal(HttpStatusCode.BadRequest, recusada.StatusCode);
        Assert.True((await recusada.Json()).GetProperty("errors").TryGetProperty("matriculaId", out _));
        Assert.Equal(HttpStatusCode.NotFound, (await outro.Cliente.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { aceitaLideranca = true })).StatusCode);

        Assert.Equal(HttpStatusCode.Created, (await t.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { aceitaLideranca = true })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t.ClienteAluno.GetAsync($"/api/conversas/{conversa}/destino")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { aceitaLideranca = true })).StatusCode);
    }

    // C72
    [Fact]
    public async Task Aceite_decide_se_vai_ao_lider()
    {
        var t = await Turma.Criar(f);

        var aceitou = await t.Ler(await t.Transferir(new { aceitaLideranca = true }));
        var recusou = await t.Ler(await t.Transferir(new { aceitaLideranca = false }));
        var omitiu = await t.Ler(await t.Transferir(new { }));

        Assert.Equal((t.Lideranca!.Id, 1), (aceitou.SetorId, aceitou.EtapaOrdem));
        foreach (var pulou in new[] { recusou, omitiu }) Assert.Equal((t.Coordenacao.Id, 2), (pulou.SetorId, pulou.EtapaOrdem));
    }

    // AC 7 e AC 59: com o aceite mas sem liderança disponível, o chamado vai à coordenação
    [Fact]
    public async Task Aceite_sem_lideranca_disponivel_vai_a_coordenacao()
    {
        var t = await Turma.Criar(f, comLider: false);

        var chamado = await t.Ler(await t.Transferir(new { aceitaLideranca = true }));

        Assert.Equal((t.Coordenacao.Id, 2), (chamado.SetorId, chamado.EtapaOrdem));
    }
}
