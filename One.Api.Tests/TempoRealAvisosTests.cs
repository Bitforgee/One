using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Chamados;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

// tempo-real-signalr S2: o cliente .NET conectado ao hub real recebe o aviso depois de cada gravação feita pela API.
public class TempoRealAvisosTests(OneFactory f) : IClassFixture<OneFactory>
{
    // Aluno no grupo do chamado e o atendente B da triagem na fila; os dois já com o chamado criado.
    sealed record Cena(Balcao B, Conectado Aluno, Conectado Fila) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await Aluno.DisposeAsync();
            await Fila.DisposeAsync();
        }
    }

    async Task<Cena> Montar(Balcao b, string? numero)
    {
        var aluno = await f.Abrir(b.Instituicao, b.Aluno.Usuario);
        var fila = await f.Abrir(b.Instituicao, b.B.Usuario);
        if (numero is not null) await aluno.Entrar(numero);
        await fila.EntrarNaFila();
        return new Cena(b, aluno, fila);
    }

    // O semente dá nomes e números de matrícula aleatórios; a comparação entre as duas execuções ignora só eles.
    static async Task<(string, HttpStatusCode)> Corpo(HttpResponseMessage r) => (System.Text.RegularExpressions.Regex.Replace(await r.Content.ReadAsStringAsync(), "Pessoa [0-9a-f]{6}|[0-9]{10}", "x"), r.StatusCode);

    [Fact]
    public async Task Cada_caminho_que_grava_chamado_avisa()
    {
        var cenario = await Cenario.Criar(f);
        var b = await Balcao.Criar(f, cenario.Instituicao);
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        var admin = await f.Entrar(b.Instituicao, await f.Usuario(b.Instituicao, [Papeis.Administrador]));
        var original = await b.Chamado();
        var caminhos = new (string nome, string estado, Func<string, Task<HttpResponseMessage>> agir)[]
        {
            ("assumir", Aberto, n => b.A.Cliente.PostAsync($"/api/chamados/{n}/assumir", null)),
            ("cancelar", Aberto, n => b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{n}/cancelar", new { motivo = "Resolvi sozinho." })),
            ("confirmar", Resolvido, n => b.ClienteAluno.PostAsync($"/api/chamados/{n}/confirmar", null)),
            ("encaminhar", Aberto, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/encaminhar", new { setorId = b.Outro.Id, motivo = "É do financeiro." })),
            ("duplicado", Aberto, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/duplicado", new { numeroOriginal = original })),
            ("reclassificar", Aberto, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/reclassificar", new { categoriaId = categoria.Id })),
            ("rejeitar", Resolvido, n => b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{n}/rejeitar", new { motivo = "Continua sem boleto." })),
            ("resolver", EmAtendimento, n => b.A.Cliente.PostAsJsonAsync($"/api/chamados/{n}/resolver", new { texto = "Boleto reemitido." })),
            ("mensagem do atendente", Aberto, n => Balcao.Mensagem(b.A.Cliente, n, "Vou verificar.")),
            ("mensagem do aluno", Aberto, n => Balcao.Mensagem(b.ClienteAluno, n, "Segue o comprovante.")),
            ("nota interna", Aberto, n => Balcao.Mensagem(b.A.Cliente, n, "Aluno ligou.", "NOTA")),
            ("desativar usuário", EmAtendimento, n => admin.PostAsJsonAsync($"/api/admin/usuarios/{b.A.Usuario.Id}/desativar", new { })),
        };
        Assert.Equal(12, caminhos.Length);

        foreach (var (nome, estado, agir) in caminhos)
        {
            var numero = await b.Chamado(estado);
            await using var cena = await Montar(b, numero);
            cena.Aluno.Limpar();
            cena.Fila.Limpar();
            var r = await agir(numero);
            Assert.True(r.IsSuccessStatusCode, $"{nome}: {(int)r.StatusCode}");
            Assert.True(await cena.Aluno.Receber($"ChamadoMudou:{numero}"), $"{nome}: ChamadoMudou");
            Assert.True(await cena.Fila.Receber("FilaMudou"), $"{nome}: FilaMudou");
        }

        // os 2 caminhos em que o chamado nasce agora: só a fila é avisada, não há grupo de chamado para entrar antes
        await using var fila = await f.Abrir(b.Instituicao, b.B.Usuario);
        await fila.EntrarNaFila();
        fila.Limpar();
        var direto = await b.ClienteAluno.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "Preciso de ajuda com o boleto" });
        Assert.Equal(HttpStatusCode.Created, direto.StatusCode);
        Assert.True(await fila.Receber("FilaMudou"), "atendimento-direto");

        fila.Limpar();
        f.Llm.Devolver(cenario.RespostaBoletoValida());
        var (id, _) = await cenario.Primeira();
        var transferir = await cenario.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { });
        Assert.Equal(HttpStatusCode.Created, transferir.StatusCode);
        Assert.True(await fila.Receber("FilaMudou"), "transferir");
    }

    [Fact]
    public async Task Agendador_avisa_fechamento_lembrete_e_volta_para_resolvido()
    {
        var b = await Balcao.Criar(f);
        var fechar = await b.Chamado(Resolvido);
        await b.Recuar(fechar, TimeSpan.FromDays(8));
        var lembrar = await b.Chamado(AguardandoAluno);
        var voltar = await b.Chamado(AguardandoAluno);
        var agora = f.Relogio.GetUtcNow().UtcDateTime;
        await f.Db(b.Instituicao.Id, async db =>
        {
            await db.Chamados.Where(c => c.Numero == lembrar).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, agora.AddDays(-4)));
            await db.Chamados.Where(c => c.Numero == voltar).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, agora.AddDays(-30)));
        });
        var aluno = await f.Abrir(b.Instituicao, b.Aluno.Usuario);
        await using var _ = aluno;
        await using var fila = await f.Abrir(b.Instituicao, b.B.Usuario);
        foreach (var n in new[] { fechar, lembrar, voltar }) await aluno.Entrar(n);
        await fila.EntrarNaFila();
        aluno.Limpar();
        fila.Limpar();

        await f.Services.GetRequiredService<Agendador>().Executar();

        Assert.Equal(Fechado, (await b.Ler(fechar)).Estado);
        Assert.True((await b.Ler(lembrar)).LembreteEm is not null);
        Assert.Equal(Resolvido, (await b.Ler(voltar)).Estado);
        foreach (var n in new[] { fechar, lembrar, voltar }) Assert.True(await aluno.Receber($"ChamadoMudou:{n}"), n);
        // cada uma das 3 tarefas manda o seu FilaMudou (o setor é o mesmo): 3 no total, nem menos nem mais
        var fim = DateTime.UtcNow.AddSeconds(5);
        while (fila.Recebidos.Count(e => e == "FilaMudou") < 3 && DateTime.UtcNow < fim) await Task.Delay(20);
        await Task.Delay(300);
        Assert.Equal(3, fila.Recebidos.Count(e => e == "FilaMudou"));
    }

    [Fact]
    public async Task Transferir_avisa_so_depois_do_commit_e_a_fila_ja_traz_o_chamado()
    {
        var c = await Cenario.Criar(f);
        var b = await Balcao.Criar(f, c.Instituicao);
        await using var fila = await f.Abrir(b.Instituicao, b.B.Usuario);
        await fila.EntrarNaFila();
        fila.AoReceber = async _ => await (await b.B.Cliente.GetAsync("/api/chamados?escopo=fila")).Content.ReadAsStringAsync();

        f.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();
        f.Commit.Atraso = TimeSpan.FromMilliseconds(800); // o aviso, se saísse no SaveChanges, chegaria e leria a fila durante esta espera
        HttpResponseMessage r;
        try { r = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { }); }
        finally { f.Commit.Atraso = TimeSpan.Zero; }
        var numero = (await r.Json()).GetProperty("numero").GetString()!;

        Assert.True(await fila.Receber("FilaMudou"));
        while (fila.Leituras.IsEmpty) await Task.Delay(20);
        Assert.Contains(numero, fila.Leituras.First());
    }

    [Fact]
    public async Task Aviso_chega_com_a_mudanca_ja_visivel_no_GET()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        await using var cena = await Montar(b, numero);
        cena.Aluno.AoReceber = async _ => await (await b.ClienteAluno.GetAsync($"/api/chamados/{numero}")).Content.ReadAsStringAsync();

        var r = await Balcao.Mensagem(b.A.Cliente, numero, "Resposta nova do atendente.");
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);

        Assert.True(await cena.Aluno.Receber($"ChamadoMudou:{numero}"));
        while (cena.Aluno.Leituras.IsEmpty) await Task.Delay(20);
        Assert.Contains("Resposta nova do atendente.", cena.Aluno.Leituras.First());
    }

    [Fact]
    public async Task Falha_no_envio_mantem_a_resposta_da_acao()
    {
        var saudavel = await RodarAcoes(falhar: false);
        var quebrado = await RodarAcoes(falhar: true);
        Assert.Equal(saudavel.responder, quebrado.responder);
        Assert.Equal(saudavel.transferir, quebrado.transferir);
        Assert.Equal(HttpStatusCode.Created, quebrado.responder.Item2);
        Assert.Equal(HttpStatusCode.Created, quebrado.transferir.Item2);
        Assert.Equal(2, quebrado.avisos);
        Assert.Equal(0, saudavel.avisos);
    }

    static async Task<((string, HttpStatusCode) responder, (string, HttpStatusCode) transferir, int avisos)> RodarAcoes(bool falhar)
    {
        await using var g = new OneFactoryComGravador();
        await g.InitializeAsync();
        var b = await Balcao.Criar(g);
        var numero = await b.Chamado();
        var c = await Cenario.Criar(g);
        g.Llm.Devolver(c.RespostaBoletoValida());
        var (id, _) = await c.Primeira();

        g.Hub.Falhar = falhar;
        var responder = await Corpo(await Balcao.Mensagem(b.A.Cliente, numero, "Vou verificar."));
        var transferir = await Corpo(await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { }));
        var avisos = g.Logs.Entradas.Count(l => l.Nivel == Microsoft.Extensions.Logging.LogLevel.Warning && l.Categoria.EndsWith(nameof(AvisarMudanca)));
        return (responder, transferir, avisos);
    }

    [Fact]
    public async Task Outra_instituicao_com_o_mesmo_numero_nao_recebe_nada()
    {
        var a = await Balcao.Criar(f);
        var outra = await Balcao.Criar(f);
        var (na, nb) = (await a.Chamado(), await outra.Chamado());
        Assert.Equal(na, nb);
        await using var ca = await Montar(a, na);
        await using var cb = await Montar(outra, nb);
        ca.Aluno.Limpar();
        ca.Fila.Limpar();
        cb.Aluno.Limpar();
        cb.Fila.Limpar();

        Assert.True((await a.A.Cliente.PostAsync($"/api/chamados/{na}/assumir", null)).IsSuccessStatusCode);

        Assert.True(await ca.Aluno.Receber($"ChamadoMudou:{na}"));
        Assert.True(await ca.Fila.Receber("FilaMudou"));
        Assert.Empty(await cb.Aluno.Quieto());
        Assert.Empty(cb.Fila.Recebidos);
    }

    async Task<List<string>> Encaminhar(Balcao b, string numero, Conectado triagem, Conectado outro, Func<Task> agir)
    {
        triagem.Limpar();
        outro.Limpar();
        await agir();
        await triagem.Receber("FilaMudou");
        await outro.Quieto();
        return [.. triagem.Recebidos.Select(e => "triagem:" + e), .. outro.Recebidos.Select(e => "outro:" + e)];
    }

    [Fact]
    public async Task Encaminhar_avisa_a_fila_antiga_e_a_nova()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        await using var triagem = await f.Abrir(b.Instituicao, b.B.Usuario);
        await using var outro = await f.Abrir(b.Instituicao, b.Alheio.Usuario);
        await triagem.EntrarNaFila();
        await outro.EntrarNaFila();

        var recebidos = await Encaminhar(b, numero, triagem, outro, async () =>
            Assert.True((await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/encaminhar", new { setorId = b.Outro.Id, motivo = "É do financeiro." })).IsSuccessStatusCode));

        Assert.Equal(["outro:FilaMudou", "triagem:FilaMudou"], recebidos.Order());
    }

    [Fact]
    public async Task Reclassificar_no_mesmo_setor_avisa_uma_fila()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var categoria = await f.Categoria(b.Instituicao, "Financeiro");
        await using var triagem = await f.Abrir(b.Instituicao, b.B.Usuario);
        await using var outro = await f.Abrir(b.Instituicao, b.Alheio.Usuario);
        await triagem.EntrarNaFila();
        await outro.EntrarNaFila();

        var recebidos = await Encaminhar(b, numero, triagem, outro, async () =>
            Assert.True((await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/reclassificar", new { categoriaId = categoria.Id })).IsSuccessStatusCode));

        Assert.Equal(["triagem:FilaMudou"], recebidos);
        Assert.Equal(b.Triagem.Id, (await b.Ler(numero)).SetorId);
    }

    [Fact]
    public async Task Conversa_sem_chamado_nao_envia_evento()
    {
        var c = await Cenario.Criar(f);
        var b = await Balcao.Criar(f, c.Instituicao);
        await using var aluno = await f.Abrir(c.Instituicao, c.Aluno.Usuario);
        await using var fila = await f.Abrir(b.Instituicao, b.B.Usuario);
        await fila.EntrarNaFila();
        f.Llm.Devolver(c.RespostaBoletoValida());

        var criada = await c.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "preciso do boleto" });
        Assert.Equal(HttpStatusCode.Created, criada.StatusCode);
        var j = await criada.Json();
        var id = j.GetProperty("conversaId").GetInt64();
        Assert.False(string.IsNullOrWhiteSpace(j.GetProperty("resposta").GetProperty("texto").GetString())); // resposta inteira no corpo da chamada

        var mensagem = await c.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "explico melhor" });
        Assert.Equal(HttpStatusCode.OK, mensagem.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await c.Cliente.PostAsync($"/api/conversas/{id}/encerrar", null)).StatusCode);

        var (id2, _) = await c.Primeira();
        Assert.Equal(HttpStatusCode.OK, (await c.Cliente.PostAsJsonAsync($"/api/conversas/{id2}/avaliacao", new { resolveu = true })).StatusCode);

        Assert.Empty(await fila.Quieto());
        Assert.Empty(aluno.Recebidos);
    }

    [Fact]
    public async Task Nota_interna_avisa_o_aluno_e_a_releitura_volta_igual()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var antes = await b.ClienteAluno.GetStringAsync($"/api/chamados/{numero}");
        await using var cena = await Montar(b, numero);
        cena.Aluno.Limpar();

        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(b.A.Cliente, numero, "Nota que o aluno não vê.", "NOTA")).StatusCode);

        Assert.True(await cena.Aluno.Receber($"ChamadoMudou:{numero}"));
        var depois = await b.ClienteAluno.GetStringAsync($"/api/chamados/{numero}");
        Assert.DoesNotContain("Nota que o aluno não vê.", depois);
        Assert.Equal(antes, depois);
    }
}
