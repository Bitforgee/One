using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using One.Api.Assistente.Conversas;
using One.Api.Dados;
using One.Api.Dados.Chamados;
using One.Api.Tests.Infra;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Tests;

public class AgendadorConcorrenciaTests(OneFactory f) : IClassFixture<OneFactory>
{
    Agendador Agendador => f.Services.GetRequiredService<Agendador>();
    DateTime Agora => f.Relogio.GetUtcNow().UtcDateTime;

    record Contagem(int Eventos, int Mensagens, int Avisos);

    static async Task<long> NovaConversa(Aluno a) =>
        (await (await a.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();

    Task<string?> Desfecho(Instituicao i, long id) => f.Db(i.Id, db => db.Conversas.Where(c => c.Id == id).Select(c => c.Desfecho).SingleAsync());

    int Abandonos(long id) => f.Logs.Entradas.Count(l => l.Mensagem.Contains($"Conversa {id} abandonada"));

    Task<Contagem> Contar(Balcao b, string numero) => f.Db(b.Instituicao.Id, async db =>
    {
        var id = await db.Chamados.Where(c => c.Numero == numero).Select(c => c.Id).SingleAsync();
        return new Contagem(await db.EventosChamado.CountAsync(e => e.ChamadoId == id), await db.MensagensChamado.CountAsync(m => m.ChamadoId == id),
            await db.EmailsSaida.CountAsync() + await db.PushesSaida.CountAsync());
    });

    Task Aguardando(Balcao b, string numero, TimeSpan ha) =>
        f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, Agora - ha)));

    static List<ItemAgendado> Do(List<ItemAgendado> lidos, string tipo, long id) => lidos.Where(x => x.Tipo == tipo && x.Id == id).ToList();

    [Fact]
    public async Task Conversa_mudada_entre_Ler_e_Processar_fica_intacta()
    {
        var aluno = await f.AlunoLogado();
        var id = await NovaConversa(aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "conversa", id));
        Assert.Equal(HttpStatusCode.OK, (await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/mensagens", new { mensagem = "ainda estou aqui" })).StatusCode);

        await Agendador.Processar(Do(lidos, "conversa", id));

        Assert.Null(await Desfecho(aluno.Instituicao, id));
        Assert.Equal(0, Abandonos(id));
    }

    [Fact]
    public async Task Resolvido_mudado_entre_Ler_e_Processar_fica_intacto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7));
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "chamado", chamadoId));
        await f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.Estado, EmAtendimento)));
        var antes = await Contar(b, numero);

        await Agendador.Processar(Do(lidos, "chamado", chamadoId));

        var c = await b.Ler(numero);
        Assert.Equal((EmAtendimento, (string?)null), (c.Estado, c.MotivoFechamento));
        Assert.Equal(antes, await Contar(b, numero));
        Assert.Equal(0, (await b.Eventos(numero)).Count(e => e.Para == Fechado));
    }

    [Fact]
    public async Task Lembrete_mudado_entre_Ler_e_Processar_fica_intacto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(4));
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "lembrete", chamadoId));
        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(b.ClienteAluno, numero, "Segue o comprovante.")).StatusCode);
        var antes = await Contar(b, numero);

        await Agendador.Processar(Do(lidos, "lembrete", chamadoId));

        Assert.Null((await b.Ler(numero)).LembreteEm);
        Assert.Equal(antes, await Contar(b, numero));
        Assert.DoesNotContain(await b.Eventos(numero), e => e.Tipo == TiposEvento.Lembrete);
    }

    [Fact]
    public async Task SemResposta_mudado_entre_Ler_e_Processar_fica_intacto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(10));
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "aguardando", chamadoId));
        await Aguardando(b, numero, TimeSpan.Zero);
        var antes = await Contar(b, numero);

        await Agendador.Processar(Do(lidos, "aguardando", chamadoId));

        Assert.Equal(AguardandoAluno, (await b.Ler(numero)).Estado);
        Assert.Equal(antes, await Contar(b, numero));
        Assert.DoesNotContain(await f.Db(b.Instituicao.Id, db => db.MensagensChamado.Where(m => m.ChamadoId == chamadoId).Select(m => m.Texto).ToListAsync()), t => t == Agendador.TextoSemResposta);
    }

    [Fact]
    public async Task SemResposta_com_resposta_do_aluno_entre_Ler_e_Processar_fica_em_atendimento()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(10));
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "aguardando", chamadoId));
        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(b.ClienteAluno, numero, "Segue o comprovante.")).StatusCode);
        var antes = await Contar(b, numero);

        await Agendador.Processar(Do(lidos, "aguardando", chamadoId));

        Assert.Equal(EmAtendimento, (await b.Ler(numero)).Estado);
        Assert.Equal(antes, await Contar(b, numero));
        Assert.DoesNotContain(await f.Db(b.Instituicao.Id, db => db.MensagensChamado.Where(m => m.ChamadoId == chamadoId).Select(m => m.Texto).ToListAsync()), t => t == Agendador.TextoSemResposta);
    }

    [Fact]
    public async Task Duas_execucoes_conversa_um_abandono()
    {
        var aluno = await f.AlunoLogado();
        var id = await NovaConversa(aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal("ABANDONADA", await Desfecho(aluno.Instituicao, id));
        Assert.Equal(1, Abandonos(id));
    }

    [Fact]
    public async Task Duas_execucoes_resolvido_um_fechamento()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7));

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal(1, (await b.Eventos(numero)).Count(e => e.Tipo == TiposEvento.Transicao && e.De == Resolvido && e.Para == Fechado));
        Assert.Equal(Fechado, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Duas_execucoes_lembrete_um_lembrete()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(4));

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal(1, (await b.Eventos(numero)).Count(e => e.Tipo == TiposEvento.Lembrete));
        Assert.Equal(1, await f.Db(b.Instituicao.Id, db => db.EmailsSaida.CountAsync(e => e.Assunto == $"[{b.Instituicao.Nome}] {numero} aguarda sua resposta")));
    }

    [Fact]
    public async Task Duas_execucoes_sem_resposta_uma_resolucao()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await Aguardando(b, numero, TimeSpan.FromDays(10));
        var chamadoId = (await b.Ler(numero)).Id;

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal(1, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == chamadoId && m.Texto == Agendador.TextoSemResposta)));
        Assert.Equal(1, (await b.Eventos(numero)).Count(e => e.Tipo == TiposEvento.Transicao && e.De == AguardandoAluno && e.Para == Resolvido));
        Assert.Equal(Resolvido, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Trecho_indexado_entre_Ler_e_Processar_fica_intacto()
    {
        var i = await f.Instituicao();
        var id = await f.SemEmbedding(i);
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "trecho", id));
        var concorrente = new Pgvector.Vector(LlmFalso.Vetor("escrita concorrente"));
        await f.Db(i.Id, db => db.TrechosFonte.Where(t => t.Id == id).ExecuteUpdateAsync(s => s.SetProperty(t => t.Embedding, concorrente)));

        await Agendador.Processar(Do(lidos, "trecho", id));

        var trecho = await f.Db(i.Id, db => db.TrechosFonte.SingleAsync(t => t.Id == id));
        Assert.Equal(concorrente.ToArray(), trecho.Embedding!.ToArray());
        Assert.Equal(0, trecho.Tentativas);
    }

    static async Task<int> EmailsNoMailpit(string para)
    {
        using var http = new HttpClient { BaseAddress = new Uri("http://localhost:8025") };
        var busca = JsonDocument.Parse(await http.GetStringAsync($"/api/v1/search?query={Uri.EscapeDataString($"to:\"{para}\"")}")).RootElement;
        return busca.GetProperty("messages").GetArrayLength();
    }

    async Task<(Instituicao, string, long)> EmailPendente()
    {
        var i = await f.Instituicao();
        var para = $"{Guid.NewGuid():N}@aluno.com";
        await f.Db(i.Id, async db =>
        {
            db.EmailsSaida.Add(EmailSaida.Criar(para, $"[{i.Nome}] ONE-1: nova resposta", "Olá", Agora));
            await db.SaveChangesAsync();
        });
        return (i, para, await f.Db(i.Id, db => db.EmailsSaida.Where(e => e.Destinatario == para).Select(e => e.Id).SingleAsync()));
    }

    [Fact]
    public async Task Email_marcado_como_enviado_entre_Ler_e_Processar_e_reenviado_como_na_base()
    {
        var (i, para, id) = await EmailPendente();
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "email", id));
        var antes = Agora.AddMinutes(-5);
        await f.Db(i.Id, db => db.EmailsSaida.Where(e => e.Id == id).ExecuteUpdateAsync(s => s.SetProperty(e => e.EnviadoEm, antes)));

        await Agendador.Processar(Do(lidos, "email", id));

        Assert.NotNull(await PrimeiroAcessoTests.EmailNoMailpit(para));
        Assert.Equal(1, await EmailsNoMailpit(para));
        var linha = await f.Db(i.Id, db => db.EmailsSaida.AsNoTracking().SingleAsync(e => e.Id == id));
        Assert.Equal((Agora, 0), (linha.EnviadoEm!.Value, linha.Tentativas));
    }

    [Fact]
    public async Task Email_apagado_entre_Ler_e_Processar_nao_envia_e_registra_o_erro_do_item()
    {
        var (i, para, id) = await EmailPendente();
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, "email", id));
        await f.Db(i.Id, db => db.EmailsSaida.Where(e => e.Id == id).ExecuteDeleteAsync());

        await Agendador.Processar(Do(lidos, "email", id));

        await Task.Delay(500);
        Assert.Equal(0, await EmailsNoMailpit(para));
        Assert.Contains(f.Logs.Entradas, l => l.Nivel == LogLevel.Error && l.Campos.GetValueOrDefault("ItemId") is long item && item == id
            && l.Campos.GetValueOrDefault("InstituicaoId") is long dono && dono == i.Id);
    }

    [Fact]
    public async Task Email_ja_enviado_antes_de_Ler_nao_e_lido_nem_reenviado()
    {
        var (i, para, id) = await EmailPendente();
        await f.Db(i.Id, db => db.EmailsSaida.Where(e => e.Id == id).ExecuteUpdateAsync(s => s.SetProperty(e => e.EnviadoEm, Agora.AddMinutes(-5))));

        var lidos = await Agendador.Ler();
        await Agendador.Executar();

        Assert.Empty(Do(lidos, "email", id));
        await Task.Delay(500);
        Assert.Equal(0, await EmailsNoMailpit(para));
    }

    async Task<long> LancamentoVencido(Instituicao i)
    {
        var (state, _) = await f.NovoLancamento(i, agora => agora - LtiLancamento.Validade - TimeSpan.FromDays(2));
        return await f.Db(i.Id, db => db.LtiLancamentos.Where(l => l.State == state).Select(l => l.Id).SingleAsync());
    }

    Task<List<long>> Lancamentos(Instituicao i) => f.Db(i.Id, db => db.LtiLancamentos.AsNoTracking().Select(l => l.Id).ToListAsync());

    [Fact]
    public async Task Duas_execucoes_lancamento_vencido_apagado_uma_vez_e_o_valido_fica_sem_erro()
    {
        var i = await f.Instituicao();
        var vencido = await LancamentoVencido(i);
        await f.NovoLancamento(i);
        var valido = (await Lancamentos(i)).Single(id => id != vencido);
        var erros = Erros();

        await Task.WhenAll(Agendador.Executar(), Agendador.Executar());

        Assert.Equal([valido], await Lancamentos(i));
        Assert.Equal(erros, Erros());
    }

    [Fact]
    public async Task Lancamento_vencido_apagado_por_outro_entre_Ler_e_Executar_nao_falha()
    {
        var i = await f.Instituicao();
        var vencido = await LancamentoVencido(i);
        await Agendador.Ler();
        await f.Db(i.Id, db => db.LtiLancamentos.Where(l => l.Id == vencido).ExecuteDeleteAsync());
        var erros = Erros();

        await Agendador.Executar();

        Assert.Empty(await Lancamentos(i));
        Assert.Equal(erros, Erros());
    }

    [Fact]
    public async Task Lancamento_renovado_por_outro_entre_Ler_e_Executar_nao_e_apagado()
    {
        var i = await f.Instituicao();
        var vencido = await LancamentoVencido(i);
        await Agendador.Ler();
        var renovado = Agora + LtiLancamento.Validade;
        await f.Db(i.Id, db => db.LtiLancamentos.Where(l => l.Id == vencido).ExecuteUpdateAsync(s => s.SetProperty(l => l.ExpiraEm, renovado)));

        await Agendador.Executar();

        Assert.Equal([vencido], await Lancamentos(i));
        Assert.Equal(renovado, await f.Db(i.Id, db => db.LtiLancamentos.AsNoTracking().Where(l => l.Id == vencido).Select(l => l.ExpiraEm).SingleAsync()));
    }

    sealed class ConflitoDeXmin(string conexao, long chamadoId) : SaveChangesInterceptor
    {
        int armado = 1;

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
        {
            eventData.Context!.ChangeTracker.DetectChanges();
            if (eventData.Context.ChangeTracker.Entries<Chamado>().Any(e => e.State == EntityState.Modified) && Interlocked.Exchange(ref armado, 0) == 1)
            {
                await using var con = new NpgsqlConnection(conexao);
                await con.OpenAsync(ct);
                await new NpgsqlCommand($"UPDATE chamado SET resumo = resumo WHERE id = {chamadoId}", con).ExecuteNonQueryAsync(ct);
            }
            return result;
        }
    }

    int Erros() => f.Logs.Entradas.Count(l => l.Nivel == LogLevel.Error);

    async Task<string> Pendente(Balcao b, string tipo)
    {
        var numero = await b.Chamado(tipo == "chamado" ? Resolvido : AguardandoAluno);
        if (tipo == "chamado") await b.Recuar(numero, TimeSpan.FromDays(7));
        else await Aguardando(b, numero, TimeSpan.FromDays(tipo == "aguardando" ? 10 : 4));
        return numero;
    }

    static (string, DateTime?, DateTime?, DateTime?, string?) Linha(Chamado c) => (c.Estado, c.LembreteEm, c.ResolvidoEm, c.FechadoEm, c.MotivoFechamento);

    [Theory]
    [InlineData("chamado")]
    [InlineData("aguardando")]
    [InlineData("lembrete")]
    public async Task Conflito_de_xmin_nao_muda_nada_e_nao_registra_erro(string tipo)
    {
        var b = await Balcao.Criar(f);
        var numero = await Pendente(b, tipo);
        var original = await b.Ler(numero);
        await using var derivada = f.WithWebHostBuilder(h => h.ConfigureTestServices(s => s.ConfigureDbContext<OneDb>(o => o.AddInterceptors(new ConflitoDeXmin(f.ConnectionString, original.Id)))));
        var agendador = derivada.Services.GetRequiredService<Agendador>();
        var lidos = await agendador.Ler();
        Assert.NotEmpty(Do(lidos, tipo, original.Id));
        var (contagem, erros) = (await Contar(b, numero), Erros());

        await agendador.Processar(Do(lidos, tipo, original.Id));

        Assert.Equal(Linha(original), Linha(await b.Ler(numero)));
        Assert.Equal(contagem, await Contar(b, numero));
        Assert.Equal(erros, Erros());
    }

    [Theory]
    [InlineData("chamado")]
    [InlineData("aguardando")]
    [InlineData("lembrete")]
    public async Task Recusa_do_dominio_nao_muda_nada_e_nao_registra_erro(string tipo)
    {
        var b = await Balcao.Criar(f);
        var numero = await Pendente(b, tipo);
        var chamadoId = (await b.Ler(numero)).Id;
        var lidos = await Agendador.Ler();
        Assert.NotEmpty(Do(lidos, tipo, chamadoId));
        await f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.Estado, EmAtendimento)));
        var (original, contagem, erros) = (await b.Ler(numero), await Contar(b, numero), Erros());

        await Agendador.Processar(Do(lidos, tipo, chamadoId));

        Assert.Equal(Linha(original), Linha(await b.Ler(numero)));
        Assert.Equal(contagem, await Contar(b, numero));
        Assert.Equal(erros, Erros());
    }}
