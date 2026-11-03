using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using One.Api.Dados;
using One.Api.Dados.Push;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class PushAgendadorTests(OneFactory f) : IClassFixture<OneFactory>
{
    Agendador Agendador => f.Services.GetRequiredService<Agendador>();
    DateTime Agora => f.Relogio.GetUtcNow().UtcDateTime;

    record Cena(Balcao B, SubscricaoPush S, string Numero, long ChamadoId);

    async Task<Cena> NovaCena(Instituicao? i = null, string descricao = "Preciso de ajuda com o boleto")
    {
        var b = await Balcao.Criar(f, i);
        var s = await f.Subscrever(b.Instituicao, b.Aluno.Usuario);
        var numero = await b.Chamado(descricao: descricao);
        return new Cena(b, s, numero, (await b.Ler(numero)).Id);
    }

    async Task<long> Fila(Cena c, DateTime? quando = null, int falhas = 0, bool enviada = false, long? subscricaoId = null)
    {
        var id = await f.Db(c.B.Instituicao.Id, async db =>
        {
            var p = PushSaida.Criar(subscricaoId ?? c.S.Id, c.ChamadoId, quando ?? Agora);
            for (var n = 0; n < falhas; n++) p.RegistrarFalha(Agora.AddDays(-1));
            if (enviada) p.Concluir(Agora);
            db.PushesSaida.Add(p);
            await db.SaveChangesAsync();
            return p.Id;
        });
        return id;
    }

    async Task<PushSaida> Linha(long id) => Assert.Single(await f.Pushes(q => q.Where(p => p.Id == id)));

    static string Payload(string slug, string numero) =>
        $$"""{"titulo":"One","corpo":"Seu chamado {{numero}} foi atualizado.","url":"/{{slug}}/chamados/{{numero}}"}""";

    List<EnvioPush> Chamadas(string endpoint) => [.. f.Push.Envios.Where(e => e.Endpoint == endpoint)];

    [Fact]
    public async Task Le_so_pendente_vencida_com_menos_de_5_tentativas()
    {
        var c = await NovaCena();
        var lidas = new[] { await Fila(c), await Fila(c, falhas: 4) };
        var naoLidas = new[] { await Fila(c, quando: Agora.AddHours(1)), await Fila(c, enviada: true), await Fila(c, falhas: 5) };

        var itens = (await Agendador.Ler()).Where(i => i.Tipo == "push").Select(i => i.Id).ToList();

        Assert.All(lidas, id => Assert.Contains(id, itens));
        Assert.All(naoLidas, id => Assert.DoesNotContain(id, itens));
    }

    [Fact]
    public async Task Envia_ao_endpoint_com_as_chaves_e_marca_enviado()
    {
        var c = await NovaCena();
        var id = await Fila(c);

        await Agendador.Executar();

        var chamada = Assert.Single(Chamadas(c.S.Endpoint));
        Assert.Equal((c.S.Endpoint, c.S.P256dh, c.S.Auth, Payload(c.B.Instituicao.Slug, c.Numero)), (chamada.Endpoint, chamada.P256dh, chamada.Auth, chamada.Payload));
        Assert.Equal(Agora, (await Linha(id)).EnviadoEm);

        f.Relogio.Advance(TimeSpan.FromMinutes(1));
        await Agendador.Executar();
        Assert.Single(Chamadas(c.S.Endpoint));
    }

    [Fact]
    public async Task Payload_exato_sem_dado_pessoal()
    {
        var univag = await f.Instituicao(slug: "univag", nome: "Univag");
        var c = await NovaCena(univag, "Assunto secreto do chamado de matrícula");
        await f.Db(univag.Id, db => db.Chamados.Where(x => x.Id == c.ChamadoId).ExecuteUpdateAsync(s => s.SetProperty(x => x.Numero, "ONE-12")));
        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(c.B.A.Cliente, "ONE-12", "Texto privado da mensagem do atendente")).StatusCode); // enfileira o push (AC 10)

        await Agendador.Executar();

        var payload = Assert.Single(Chamadas(c.S.Endpoint)).Payload;
        Assert.Equal("""{"titulo":"One","corpo":"Seu chamado ONE-12 foi atualizado.","url":"/univag/chamados/ONE-12"}""", payload);
        Assert.Equal(["titulo", "corpo", "url"], System.Text.Json.JsonDocument.Parse(payload).RootElement.EnumerateObject().Select(p => p.Name));
        var titulo = await f.Db(univag.Id, db => db.Chamados.Where(x => x.Id == c.ChamadoId).Select(x => x.Titulo).SingleAsync());
        foreach (var dado in new[] { c.B.Aluno.Usuario.Nome, c.B.Aluno.Usuario.Email, c.B.Aluno.Usuario.Cpf, "Texto privado da mensagem", titulo })
            Assert.DoesNotContain(dado, payload);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Gone)]
    public async Task Status_404_e_410_apagam_a_subscricao(HttpStatusCode status)
    {
        var c = await NovaCena();
        var outroChamado = await c.B.Chamado();
        var (p1, p2) = (await Fila(c), await f.Db(c.B.Instituicao.Id, async db =>
        {
            var p = PushSaida.Criar(c.S.Id, (await c.B.Ler(outroChamado)).Id, Agora);
            db.PushesSaida.Add(p);
            await db.SaveChangesAsync();
            return p.Id;
        }));
        f.Push.Comportamento = (e, _) => e.Endpoint == c.S.Endpoint ? throw EnviadorFalso.Falha(status) : Task.CompletedTask;

        await Agendador.Executar();

        Assert.Empty(await f.Subscricoes(q => q.Where(s => s.Id == c.S.Id)));
        Assert.Empty(await f.Pushes(q => q.Where(p => p.Id == p1 || p.Id == p2)));
        var chamadas = Chamadas(c.S.Endpoint).Count;
        f.Relogio.Advance(TimeSpan.FromHours(1));
        await Agendador.Executar();
        Assert.Equal(chamadas, Chamadas(c.S.Endpoint).Count);
    }

    [Fact]
    public async Task Outras_falhas_repetem_e_desistem_na_quinta()
    {
        var c = await NovaCena();
        var id = await Fila(c);
        Func<Exception>[] falhas =
        [
            () => EnviadorFalso.Falha(HttpStatusCode.InternalServerError), () => EnviadorFalso.Falha((HttpStatusCode)429), () => EnviadorFalso.Falha(HttpStatusCode.Forbidden),
            () => new InvalidOperationException("sem status"), () => EnviadorFalso.Falha(HttpStatusCode.InternalServerError),
        ];
        var minutos = new[] { 2, 4, 8, 16, 32 };

        for (var n = 1; n <= 5; n++)
        {
            var falha = falhas[n - 1];
            f.Push.Comportamento = (e, _) => e.Endpoint == c.S.Endpoint ? throw falha() : Task.CompletedTask;
            await Agendador.Executar();
            var p = await Linha(id);
            Assert.Equal((n, Agora.AddMinutes(minutos[n - 1]), (DateTime?)null), (p.Tentativas, p.ProximaTentativa, p.EnviadoEm));
            if (n < 5) f.Relogio.Advance(p.ProximaTentativa - Agora);
        }

        var logs = f.Logs.Entradas.Where(l => l.Campos.GetValueOrDefault("PushId") is long x && x == id).ToList();
        Assert.Equal(4, logs.Count(l => l.Nivel == LogLevel.Warning));
        var erro = Assert.Single(logs, l => l.Nivel == LogLevel.Error);
        Assert.Equal(c.B.Instituicao.Id, erro.Campos["InstituicaoId"]);
        f.Relogio.Advance(TimeSpan.FromDays(1));
        Assert.DoesNotContain(await Agendador.Ler(), i => i.Tipo == "push" && i.Id == id);
        Assert.Single(await f.Subscricoes(q => q.Where(s => s.Id == c.S.Id)));
        Assert.Equal(5, Chamadas(c.S.Endpoint).Count);
    }

    [Fact]
    public async Task Enviada_entre_a_leitura_e_o_processamento_nao_reenvia()
    {
        var c = await NovaCena();
        var id = await Fila(c);
        var itens = await Agendador.Ler();
        Assert.Contains(itens, i => i.Tipo == "push" && i.Id == id);
        var enviadoEm = Agora.AddSeconds(-5);
        await f.Db(null, db => db.PushesSaida.IgnoreQueryFilters().Where(p => p.Id == id).ExecuteUpdateAsync(s => s.SetProperty(p => p.EnviadoEm, enviadoEm)));

        await Agendador.Processar(itens.Where(i => i.Tipo == "push" && i.Id == id).ToList());

        Assert.Empty(Chamadas(c.S.Endpoint));
        Assert.Equal(enviadoEm, (await Linha(id)).EnviadoEm);
    }

    [Fact]
    public async Task Falha_e_demora_do_push_seguem_os_outros_itens()
    {
        // falha: o 1º push lança, o 2º push, 1 e-mail e 1 conversa parada são processados
        var c1 = await NovaCena();
        var c2 = await NovaCena();
        var (a, b) = (await Fila(c1), await Fila(c2));
        var para = $"{Guid.NewGuid():N}@aluno.com";
        await f.Db(c1.B.Instituicao.Id, async db =>
        {
            db.EmailsSaida.Add(new EmailSaida { Destinatario = para, Assunto = "Aviso", Corpo = "Olá", ProximaTentativa = Agora });
            await db.SaveChangesAsync();
        });
        var conversa = (await (await c1.B.Aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();
        f.Relogio.Advance(TimeSpan.FromMinutes(30));
        f.Push.Comportamento = (e, _) => e.Endpoint == c1.S.Endpoint ? throw new InvalidOperationException("serviço fora") : Task.CompletedTask;

        await Agendador.Executar();

        Assert.Equal(1, (await Linha(a)).Tentativas);
        Assert.NotNull((await Linha(b)).EnviadoEm);
        Assert.NotNull(await f.Db(c1.B.Instituicao.Id, db => db.EmailsSaida.Where(e => e.Destinatario == para).Select(e => e.EnviadoEm).SingleAsync()));
        Assert.Equal("ABANDONADA", await f.Db(c1.B.Instituicao.Id, db => db.Conversas.Where(x => x.Id == conversa).Select(x => x.Desfecho).SingleAsync()));

        // demora: o envio pendurado é cancelado aos 30 s do relógio, conta como falha e o resto do ciclo roda
        var (d, e2) = (await Fila(c1), await Fila(c2));
        f.Push.Comportamento = (e, ct) => e.Endpoint == c1.S.Endpoint ? Task.Delay(Timeout.Infinite, ct) : Task.CompletedTask;
        var antes = Chamadas(c1.S.Endpoint).Count;
        var ciclo = Agendador.Executar();
        while (Chamadas(c1.S.Endpoint).Count == antes) await Task.Delay(10);
        Assert.False(ciclo.IsCompleted);
        f.Relogio.Advance(TimeSpan.FromSeconds(30));
        await ciclo;

        Assert.Equal((1, (DateTime?)null), ((await Linha(d)).Tentativas, (await Linha(d)).EnviadoEm));
        Assert.NotNull((await Linha(e2)).EnviadoEm);
    }

    [Fact]
    public async Task Cada_item_usa_a_instituicao_da_linha()
    {
        var (c1, c2) = (await NovaCena(), await NovaCena());
        Assert.NotEqual(c1.B.Instituicao.Slug, c2.B.Instituicao.Slug);
        await Fila(c1);
        await Fila(c2);

        await Agendador.Executar();

        Assert.Equal(Payload(c1.B.Instituicao.Slug, c1.Numero), Assert.Single(Chamadas(c1.S.Endpoint)).Payload);
        Assert.Equal(Payload(c2.B.Instituicao.Slug, c2.Numero), Assert.Single(Chamadas(c2.S.Endpoint)).Payload);
    }

    [Fact]
    public async Task Subscricao_movida_de_instituicao_nao_recebe_item_antigo()
    {
        var a = await NovaCena();
        var b = await f.AlunoLogado();
        var id = await Fila(a);
        // o aluno da instituição B ativa os avisos no mesmo navegador (C6): a subscrição passa para B
        Assert.Equal(HttpStatusCode.NoContent, (await b.Cliente.PostAsJsonAsync("/api/push/subscricao", new { endpoint = a.S.Endpoint, chaves = new { p256dh = "novo-p", auth = "novo-a" } })).StatusCode);
        Assert.Equal(b.Instituicao.Id, Assert.Single(await f.Subscricoes(q => q.Where(s => s.Id == a.S.Id))).InstituicaoId);

        await Agendador.Executar();
        f.Relogio.Advance(TimeSpan.FromMinutes(1));
        await Agendador.Executar();

        Assert.Empty(Chamadas(a.S.Endpoint));
        Assert.DoesNotContain(await Agendador.Ler(), i => i.Tipo == "push" && i.Id == id);
    }
}
