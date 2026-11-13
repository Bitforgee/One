using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class AgendadorTests(OneFactory f) : IClassFixture<OneFactory>
{
    Agendador Agendador => f.Services.GetRequiredService<Agendador>();

    static async Task<long> Conversa(Aluno a) =>
        (await (await a.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();

    Task<string?> Desfecho(Instituicao i, long id) => f.Db(i.Id, db => db.Conversas.Where(c => c.Id == id).Select(c => c.Desfecho).SingleAsync());

    [Fact]
    public async Task Conversa_parada_30_min_abandona()
    {
        var aluno = await f.AlunoLogado();
        var trinta = await Conversa(aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(1));
        var vinteENove = await Conversa(aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(29));

        await Agendador.Executar();

        Assert.Equal("ABANDONADA", await Desfecho(aluno.Instituicao, trinta));
        Assert.Null(await Desfecho(aluno.Instituicao, vinteENove));
    }

    [Fact]
    public async Task Resolvido_7_dias_fecha_automaticamente()
    {
        var b = await Balcao.Criar(f);
        var vencido = await b.Chamado(Resolvido);
        var noPrazo = await b.Chamado(Resolvido);
        await b.Recuar(vencido, TimeSpan.FromDays(7));
        await b.Recuar(noPrazo, TimeSpan.FromDays(7) - TimeSpan.FromMinutes(1));

        await Agendador.Executar();

        var c = await b.Ler(vencido);
        Assert.Equal((Fechado, "FECHADO_AUTOMATICAMENTE"), (c.Estado, c.MotivoFechamento));
        var evento = (await b.Eventos(vencido)).Last();
        Assert.Equal(("TRANSICAO", (long?)null, Fechado), (evento.Tipo, evento.AtorId, evento.Para));
        Assert.Equal(Resolvido, (await b.Ler(noPrazo)).Estado);
    }

    [Fact]
    public async Task Acao_do_aluno_antes_preserva_item()
    {
        var b = await Balcao.Criar(f);
        var conversa = await Conversa(b.Aluno);
        var numero = await b.Chamado(Resolvido);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));
        await b.Recuar(numero, TimeSpan.FromDays(7) - TimeSpan.FromMinutes(30));

        var lidos = await Agendador.Ler();
        Assert.Contains(lidos, x => x.Tipo == "conversa" && x.Id == conversa);
        var chamadoId = (await b.Ler(numero)).Id;
        Assert.Contains(lidos, x => x.Tipo == "chamado" && x.Id == chamadoId);
        Assert.Equal(HttpStatusCode.OK, (await b.ClienteAluno.PostAsJsonAsync($"/api/conversas/{conversa}/mensagens", new { mensagem = "ainda estou aqui" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "Não resolveu." })).StatusCode);

        await Agendador.Processar(lidos);

        Assert.Null(await Desfecho(b.Instituicao, conversa));
        var c = await b.Ler(numero);
        Assert.Equal((EmAtendimento, (string?)null), (c.Estado, c.MotivoFechamento));
    }

    [Fact]
    public async Task Falha_num_item_segue_os_outros()
    {
        var aluno = await f.AlunoLogado();
        var quebrada = await Conversa(aluno);
        var boa = await Conversa(aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));
        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await new NpgsqlCommand($"""
            CREATE FUNCTION falha_teste() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;
            CREATE TRIGGER falha_teste BEFORE UPDATE ON conversa FOR EACH ROW WHEN (OLD.id = {quebrada}) EXECUTE FUNCTION falha_teste();
            """, con).ExecuteNonQueryAsync();
        try
        {
            await Agendador.Executar();
        }
        finally
        {
            await new NpgsqlCommand("DROP FUNCTION falha_teste CASCADE", con).ExecuteNonQueryAsync();
        }

        Assert.Null(await Desfecho(aluno.Instituicao, quebrada));
        Assert.Equal("ABANDONADA", await Desfecho(aluno.Instituicao, boa));
        Assert.Contains(f.Logs.Entradas, l => l.Nivel == LogLevel.Error && l.Campos.GetValueOrDefault("InstituicaoId") is long id && id == aluno.Instituicao.Id
            && l.Campos.GetValueOrDefault("ItemId") is long item && item == quebrada);
    }

    [Fact]
    public async Task Item_usa_fuso_nome_e_remetente_da_sua_instituicao()
    {
        var univag = await f.Instituicao(nome: "Univag");
        var demo = await f.Instituicao(nome: "Faculdade Demo", fuso: "America/Sao_Paulo");
        var destinos = new Dictionary<string, Instituicao>();
        foreach (var i in new[] { univag, demo })
        {
            var para = $"{Guid.NewGuid():N}@aluno.com";
            destinos[para] = i;
            await f.Db(i.Id, async db =>
            {
                db.EmailsSaida.Add(EmailSaida.Criar(para, $"[{i.Nome}] ONE-1: nova resposta", "Olá", f.Relogio.GetUtcNow().UtcDateTime));
                await db.SaveChangesAsync();
            });
        }

        var desde = f.Relogio.GetUtcNow().UtcDateTime.AddDays(-3);
        var lembretes = new List<(Balcao b, string numero, string esperado)>();
        foreach (var (i, horas) in new[] { (univag, -4), (demo, -3) })
        {
            var b = await Balcao.Criar(f, i);
            var numero = await b.Chamado(EstadosChamado.AguardandoAluno);
            await f.Db(i.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, desde)));
            lembretes.Add((b, numero, desde.AddHours(horas).ToString("dd/MM/yyyy HH:mm")));
        }

        await Agendador.Executar();

        foreach (var (b, numero, esperado) in lembretes)
        {
            var corpo = await f.Db(b.Instituicao.Id, db => db.EmailsSaida.Where(e => e.Assunto == $"[{b.Instituicao.Nome}] {numero} aguarda sua resposta").Select(e => e.Corpo).SingleAsync());
            Assert.Contains($"desde {esperado} (horário da instituição)", corpo);
        }
        foreach (var (para, i) in destinos)
        {
            var msg = await PrimeiroAcessoTests.EmailNoMailpit(para);
            Assert.NotNull(msg);
            Assert.Equal(i.Nome, msg.Value.GetProperty("From").GetProperty("Name").GetString());
            Assert.Equal($"[{i.Nome}] ONE-1: nova resposta", msg.Value.GetProperty("Subject").GetString());
            Assert.NotNull(await f.Db(i.Id, db => db.EmailsSaida.Where(e => e.Destinatario == para).Select(e => e.EnviadoEm).SingleAsync()));
        }
    }
}
