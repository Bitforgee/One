using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

// fluxos-atendimento C73 a C77 (door 7): a liderança vê só o necessário, responde e sobe; o resto é da equipe.
public class LiderVisaoTests(OneFactory f) : IClassFixture<OneFactory>
{
    // C73
    [Fact]
    public async Task Detalhe_do_lider_sem_transcricao_nem_matricula()
    {
        var t = await Turma.Criar(f);
        var numero = await t.NaLideranca();
        var antes = await t.Detalhe(t.Lider!.Cliente, numero);
        Assert.Equal(["assumir", "nota", "resolver", "responder", "subir"], antes.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()!).Order());
        Assert.True((await Balcao.Mensagem(t.Lider.Cliente, numero, "Vamos olhar isso")).IsSuccessStatusCode);
        Assert.True((await Balcao.Mensagem(t.Lider.Cliente, numero, "Anotação interna", tipo: "NOTA")).IsSuccessStatusCode);

        var d = await t.Detalhe(t.Lider.Cliente, numero);

        Assert.Equal(JsonValueKind.Array, d.GetProperty("transcricao").ValueKind);
        Assert.Equal(0, d.GetProperty("transcricao").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, d.GetProperty("matricula").GetProperty("numero").ValueKind);
        Assert.Equal(JsonValueKind.Null, d.GetProperty("categorias").ValueKind);
        // o líder não reclassifica nem encaminha (AC 61), então não recebe as listas de destino; a origem da categoria vem do que a IA citou, que é da equipe
        Assert.Equal(JsonValueKind.Null, d.GetProperty("setores").ValueKind);
        Assert.Equal(JsonValueKind.Null, d.GetProperty("origemCategoria").ValueKind);
        Assert.Equal(t.Aluno.Usuario.Nome, d.GetProperty("solicitante").GetString());
        Assert.Equal("Dúvida sobre a nota da prova.", d.GetProperty("resumo").GetString());
        Assert.Equal(("ADS", 3), (d.GetProperty("matricula").GetProperty("curso").GetString(), d.GetProperty("matricula").GetProperty("semestre").GetInt32()));
        Assert.Contains("NOTA", d.GetProperty("mensagens").EnumerateArray().Select(m => m.GetProperty("tipo").GetString()));
        Assert.Contains("Vamos olhar isso", d.GetProperty("mensagens").EnumerateArray().Select(m => m.GetProperty("texto").GetString()));
        Assert.NotEqual(0, d.GetProperty("eventos").GetArrayLength());
        Assert.Equal(1, d.GetProperty("fluxo").GetProperty("etapa").GetInt32());
        Assert.Equal("LIDERANCA_SEMESTRE", d.GetProperty("fluxo").GetProperty("destino").GetString());
        // a conversa e o número da matrícula também não aparecem em lugar nenhum do corpo
        var texto = d.GetRawText();
        var numeroDaMatricula = await f.Db(t.I.Id, db => db.Matriculas.Where(m => m.UsuarioId == t.Aluno.Usuario.Id).Select(m => m.Numero).SingleAsync());
        Assert.DoesNotContain(numeroDaMatricula, texto);
        Assert.DoesNotContain("Pode detalhar?", texto);

        // a coordenação, que vê tudo, ainda vê a transcrição
        var aluno = await t.Detalhe(t.ClienteAluno, numero);
        Assert.Equal(1, aluno.GetProperty("transcricao").EnumerateArray().Count(m => m.GetProperty("texto").GetString() == "preciso de ajuda com a nota"));
    }

    // Impact do plano: a lista `setores` do detalhe deixa de oferecer lideranças à equipe comum
    [Fact]
    public async Task Setores_do_detalhe_da_equipe_nao_oferecem_lideranca()
    {
        var t = await Turma.Criar(f);
        var financeiro = await f.Setor(t.I, "Financeiro");
        var numero = await t.Transferir(new { aceitaLideranca = false }); // vai à coordenação, vista pela equipe comum

        var d = await t.Detalhe(t.Coord.Cliente, numero);

        var ofertados = d.GetProperty("setores").EnumerateArray().Select(s => s.GetProperty("id").GetInt64()).ToList();
        Assert.Contains(financeiro.Id, ofertados); // a lista existe e traz os setores comuns
        Assert.DoesNotContain(t.Lideranca!.Id, ofertados);
    }

    // C74
    [Fact]
    public async Task Lider_nao_reclassifica_nem_encaminha()
    {
        var t = await Turma.Criar(f);
        var numero = await t.NaLideranca();
        var outra = await f.Categoria(t.I, "Financeiro");

        var reclassificar = await t.Lider!.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId = outra.Id });
        var duplicado = await t.Lider.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/duplicado", new { numeroOriginal = "ONE-1" });
        var encaminhar = await t.Lider.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = t.Coordenacao.Id, motivo = "Passa para a coordenação" });

        Assert.Equal([HttpStatusCode.Forbidden, HttpStatusCode.Forbidden, HttpStatusCode.Forbidden], [reclassificar.StatusCode, duplicado.StatusCode, encaminhar.StatusCode]);
        Assert.Equal(t.Lideranca!.Id, (await t.Ler(numero)).SetorId);
    }

    // C75
    [Fact]
    public async Task Anexo_da_conversa_404_para_o_lider()
    {
        var t = await Turma.Criar(f);
        var conversa = await t.Conversa();
        var mensagem = await t.ClienteAluno.PostAsync($"/api/conversas/{conversa}/mensagens", new MultipartFormDataContent
        {
            { new StringContent("segue o comprovante"), "mensagem" },
            { new ByteArrayContent(Balcao.Arquivo(Balcao.Pdf, 200)), "anexos", "prova.pdf" },
        });
        Assert.True(mensagem.IsSuccessStatusCode, $"{(int)mensagem.StatusCode}");
        var numero = (await (await t.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/transferir", new { aceitaLideranca = true })).Json()).GetProperty("numero").GetString()!;
        var anexo = await f.Db(t.I.Id, db => db.AnexosConversa.Select(a => a.Id).SingleAsync());

        Assert.Equal(HttpStatusCode.NotFound, (await t.Lider!.Cliente.GetAsync($"/api/conversas/anexos/{anexo}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await t.ClienteAluno.GetAsync($"/api/conversas/anexos/{anexo}")).StatusCode);
        // depois de subir, a coordenação (equipe completa) abre o anexo da conversa
        Assert.Equal(HttpStatusCode.OK, (await t.Lider.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/subir", new { motivo = "É da coordenação" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await t.Coord.Cliente.GetAsync($"/api/conversas/anexos/{anexo}")).StatusCode);
    }

    // C76
    [Fact]
    public async Task Lider_perde_o_chamado_ao_subir()
    {
        var t = await Turma.Criar(f);
        var numero = await t.NaLideranca();
        Assert.Equal(HttpStatusCode.OK, (await t.Lider!.Cliente.GetAsync($"/api/chamados/{numero}")).StatusCode);

        var subiu = await t.Lider.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/subir", new { motivo = "É assunto da coordenação" });

        Assert.Equal(HttpStatusCode.OK, subiu.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t.Lider.Cliente.GetAsync($"/api/chamados/{numero}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t.Lider.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/subir", new { motivo = "De novo" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await t.Coord.Cliente.GetAsync($"/api/chamados/{numero}")).StatusCode);
        var chamado = await t.Ler(numero);
        Assert.Equal((t.Coordenacao.Id, 2, 0), (chamado.SetorId, chamado.EtapaOrdem, chamado.Encaminhamentos));
    }

    // C77
    [Fact]
    public async Task Solicitante_atendente_ve_como_aluno()
    {
        var t = await Turma.Criar(f);
        var dupla = await f.Usuario(t.I, [Papeis.Aluno, Papeis.Atendente]);
        await f.Db(t.I.Id, async db => { db.AtendenteSetores.Add(new AtendenteSetor { UsuarioId = dupla.Id, SetorId = t.Lideranca!.Id }); await db.SaveChangesAsync(); });
        var aluno = new Aluno(t.I, dupla, Semente.Senha, await f.Entrar(t.I, dupla));
        var numero = await t.Transferir(new { aceitaLideranca = true }, aluno);
        Assert.Equal(t.Lideranca!.Id, (await t.Ler(numero)).SetorId);

        var d = await t.Detalhe(aluno.Cliente, numero);

        Assert.Equal(JsonValueKind.Null, d.GetProperty("categorias").ValueKind);
        Assert.NotEqual(JsonValueKind.Null, d.GetProperty("matricula").GetProperty("numero").ValueKind);
        Assert.Equal(1, d.GetProperty("transcricao").EnumerateArray().Count(m => m.GetProperty("texto").GetString() == "preciso de ajuda com a nota"));
        Assert.Contains("cancelar", d.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()));
        Assert.DoesNotContain("subir", d.GetProperty("acoes").EnumerateArray().Select(a => a.GetString()));
        Assert.Equal(HttpStatusCode.Forbidden, (await aluno.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/subir", new { motivo = "Quero subir" })).StatusCode);
    }
}
