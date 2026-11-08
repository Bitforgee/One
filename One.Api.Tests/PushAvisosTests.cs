using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using One.Api.Dados;
using One.Api.Dados.Push;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class PushAvisosTests(OneFactory f) : IClassFixture<OneFactory>
{
    Agendador Agendador => f.Services.GetRequiredService<Agendador>();

    async Task<(int emails, List<PushSaida> pushes)> Contagem(Balcao b) =>
        (await f.Db(b.Instituicao.Id, db => db.EmailsSaida.CountAsync()), await f.Pushes(q => q.Where(p => p.InstituicaoId == b.Instituicao.Id)));

    // roda a origem e confere: 1 e-mail novo e 1 PushSaida por aparelho do aluno, para o chamado e com ProximaTentativa = relógio
    async Task Confere(Balcao b, SubscricaoPush[] aparelhos, Func<Task<string>> origem)
    {
        var (emails, pushes) = await Contagem(b);
        var numero = await origem();
        var (emailsDepois, pushesDepois) = await Contagem(b);
        var chamadoId = (await b.Ler(numero)).Id;
        var novos = pushesDepois.Where(p => pushes.All(x => x.Id != p.Id)).ToList();
        Assert.Equal(emails + 1, emailsDepois);
        Assert.Equal(aparelhos.Select(a => a.Id).Order(), novos.Select(p => p.SubscricaoId).Order());
        Assert.All(novos, p => Assert.Equal((chamadoId, f.Relogio.GetUtcNow().UtcDateTime, 0, (DateTime?)null), (p.ChamadoId, p.ProximaTentativa, p.Tentativas, p.EnviadoEm)));
    }

    [Fact]
    public async Task Cinco_origens_enfileiram_push_por_aparelho()
    {
        var b = await Balcao.Criar(f);
        SubscricaoPush[] aparelhos = [await f.Subscrever(b.Instituicao, b.Aluno.Usuario), await f.Subscrever(b.Instituicao, b.Aluno.Usuario)];

        // ResponderChamado -> Avisos.NovaResposta
        await Confere(b, aparelhos, () => b.Chamado(EstadosChamado.AguardandoAluno));
        // ResolverChamado -> Avisos.Resolvido
        await Confere(b, aparelhos, () => b.Chamado(EstadosChamado.Resolvido));
        // MarcarDuplicado -> Avisos.NovaResposta
        var original = await b.Chamado();
        await Confere(b, aparelhos, async () =>
        {
            var duplicado = await b.Chamado();
            Assert.Equal(HttpStatusCode.OK, (await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{duplicado}/duplicado", new { numeroOriginal = original })).StatusCode);
            return duplicado;
        });
        // Agendador.ResolverSemResposta -> Avisos.Resolvido
        var aguardando = await b.Chamado(EstadosChamado.AguardandoAluno);
        await Confere(b, aparelhos, async () =>
        {
            await f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == aguardando).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, f.Relogio.GetUtcNow().UtcDateTime.AddDays(-8))));
            await Agendador.Executar();
            Assert.Equal(EstadosChamado.Resolvido, (await b.Ler(aguardando)).Estado);
            return aguardando;
        });
        // Agendador.Lembrar -> Avisos.AguardaResposta
        var lembrete = await b.Chamado(EstadosChamado.AguardandoAluno);
        await Confere(b, aparelhos, async () =>
        {
            await f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == lembrete).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, f.Relogio.GetUtcNow().UtcDateTime.AddDays(-3))));
            await Agendador.Executar();
            Assert.NotNull((await b.Ler(lembrete)).LembreteEm);
            return lembrete;
        });
    }

    [Fact]
    public async Task Sem_subscricao_ou_sem_chaves_so_email()
    {
        var b = await Balcao.Criar(f);
        var (emails, _) = await Contagem(b);
        await b.Chamado(EstadosChamado.AguardandoAluno);
        var (depois, pushes) = await Contagem(b);
        Assert.Equal(emails + 1, depois);
        Assert.Empty(pushes);

        // com aparelho, mas sem a chave privada
        await f.Subscrever(b.Instituicao, b.Aluno.Usuario);
        var numero = await b.Chamado();
        await using var fx = f.WithWebHostBuilder(h => h.UseSetting("Push:ChavePrivada", ""));
        var a = await fx.EntrarEm(b.Instituicao, b.A.Usuario);
        Assert.Equal(HttpStatusCode.OK, (await a.PostAsync($"/api/chamados/{numero}/assumir", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(a, numero, "Pode enviar o comprovante?")).StatusCode);
        var (final, semPush) = await Contagem(b);
        Assert.Equal(depois + 1, final);
        Assert.Empty(semPush);
    }

    [Fact]
    public async Task Falha_na_transacao_nao_deixa_email_nem_push()
    {
        var b = await Balcao.Criar(f);
        await f.Subscrever(b.Instituicao, b.Aluno.Usuario);
        var numero = await b.Chamado();
        Assert.Equal(HttpStatusCode.OK, (await b.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null)).StatusCode);
        var id = (await b.Ler(numero)).Id;
        var (emails, pushes) = await Contagem(b);
        var mensagens = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == id));

        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await new NpgsqlCommand("""
            CREATE FUNCTION falha_push() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;
            CREATE TRIGGER falha_push BEFORE INSERT ON push_saida FOR EACH ROW EXECUTE FUNCTION falha_push();
            """, con).ExecuteNonQueryAsync();
        HttpResponseMessage r;
        try
        {
            r = await Balcao.Mensagem(b.A.Cliente, numero, "Resposta que não pode ficar pela metade");
        }
        finally
        {
            await new NpgsqlCommand("DROP FUNCTION falha_push CASCADE", con).ExecuteNonQueryAsync();
        }

        Assert.Equal(HttpStatusCode.InternalServerError, r.StatusCode);
        var (emailsDepois, pushesDepois) = await Contagem(b);
        Assert.Equal(emails, emailsDepois);
        Assert.Equal(pushes.Count, pushesDepois.Count);
        Assert.Equal(mensagens, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == id)));
    }

    [Fact]
    public async Task So_o_solicitante_recebe()
    {
        var b = await Balcao.Criar(f);
        var colega = await f.AlunoLogado(b.Instituicao);
        var doAluno = await f.Subscrever(b.Instituicao, b.Aluno.Usuario);
        var doAtendente = await f.Subscrever(b.Instituicao, b.A.Usuario);
        var doColega = await f.Subscrever(b.Instituicao, colega.Usuario);

        await b.Chamado(EstadosChamado.AguardandoAluno); // responder
        await b.Chamado(EstadosChamado.Resolvido); // resolver
        var original = await b.Chamado();
        var duplicado = await b.Chamado();
        await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{duplicado}/duplicado", new { numeroOriginal = original });

        var pushes = await f.Pushes(q => q.Where(p => p.InstituicaoId == b.Instituicao.Id));
        Assert.Equal(3, pushes.Count);
        Assert.All(pushes, p => Assert.Equal(doAluno.Id, p.SubscricaoId));
        Assert.DoesNotContain(pushes, p => p.SubscricaoId == doAtendente.Id || p.SubscricaoId == doColega.Id);
    }
}
