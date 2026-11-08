using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

// refatoracao-solid S2: cada prazo vem de Prazos:* e o texto que o aluno lê diz o mesmo número.
public class PrazosTests(OneFactoryPrazos f, OneFactory padrao) : IClassFixture<OneFactoryPrazos>, IClassFixture<OneFactory>
{
    static Task<string> CorpoResolvido(OneFactory f, Balcao b, string numero) =>
        f.Db(b.Instituicao.Id, db => db.EmailsSaida.Where(e => e.Assunto == $"[{b.Instituicao.Nome}] {numero} foi resolvida").Select(e => e.Corpo).SingleAsync());

    static Task AguardandoHa(OneFactory f, Balcao b, string numero, TimeSpan quanto) =>
        f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, c => c.AguardandoDesde - quanto)));

    static Task<HttpResponseMessage> Rejeitar(Balcao b, string numero) =>
        b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "Não resolveu." });

    // C8
    [Fact]
    public async Task Confirmacao_de_10_dias_fecha_no_10o_e_textos_dizem_10()
    {
        var b = await Balcao.Criar(f);
        var vencido = await b.Chamado(Resolvido);
        var noPrazo = await b.Chamado(Resolvido);
        await b.Recuar(vencido, TimeSpan.FromDays(10));
        await b.Recuar(noPrazo, TimeSpan.FromDays(9) + TimeSpan.FromHours(23));

        await f.Services.GetRequiredService<Agendador>().Executar();

        Assert.Equal((Fechado, "FECHADO_AUTOMATICAMENTE"), ((await b.Ler(vencido)).Estado, (await b.Ler(vencido)).MotivoFechamento));
        Assert.Equal("Fechado automaticamente: 10 dias sem confirmação", (await b.Eventos(vencido)).Last().Detalhe);
        Assert.Equal(Resolvido, (await b.Ler(noPrazo)).Estado);
        Assert.Contains("(até 10 dias)", await CorpoResolvido(f, b, vencido));
    }

    // C9
    [Fact]
    public async Task Rejeicao_segue_prazo_de_confirmacao()
    {
        var b = await Balcao.Criar(f);
        var noLimite = await b.Chamado(Resolvido);
        var depois = await b.Chamado(Resolvido);
        await b.Recuar(noLimite, TimeSpan.FromDays(10));
        await b.Recuar(depois, TimeSpan.FromDays(10) + TimeSpan.FromMinutes(1));

        Assert.Equal(HttpStatusCode.OK, (await Rejeitar(b, noLimite)).StatusCode);
        var r = await Rejeitar(b, depois);
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("O prazo de 10 dias para rejeitar a resolução terminou.", (await r.Json()).GetProperty("detail").GetString());
    }

    // C10
    [Fact]
    public async Task Lembrete_de_4_dias_no_texto()
    {
        var b = await Balcao.Criar(f);
        var cedo = await b.Chamado(AguardandoAluno);
        var noDia = await b.Chamado(AguardandoAluno);
        await AguardandoHa(f, b, cedo, TimeSpan.FromDays(3) + TimeSpan.FromHours(23));
        await AguardandoHa(f, b, noDia, TimeSpan.FromDays(4));

        await f.Services.GetRequiredService<Agendador>().Executar();

        Assert.DoesNotContain(await b.Eventos(cedo), e => e.Tipo == "LEMBRETE");
        var lembrete = Assert.Single(await b.Eventos(noDia), e => e.Tipo == "LEMBRETE");
        Assert.Equal("Lembrete ao aluno: 4 dias aguardando resposta", lembrete.Detalhe);
    }

    // C11: sem nenhuma chave Prazos:*, os valores e os textos de hoje
    [Fact]
    public async Task Padroes_sem_configuracao()
    {
        var prazos = Prazos.Ler(new ConfigurationBuilder().Build());
        Assert.Equal(TimeSpan.FromMinutes(30), prazos.Abandono);
        Assert.Equal(TimeSpan.FromDays(7), prazos.Confirmacao);
        Assert.Equal(TimeSpan.FromDays(7), prazos.Rejeicao);
        Assert.Equal(TimeSpan.FromDays(3), prazos.Lembrete);
        Assert.Equal(TimeSpan.FromDays(7), prazos.ResolverAguardando);

        var b = await Balcao.Criar(padrao);
        var fecha = await b.Chamado(Resolvido);
        var rejeita = await b.Chamado(Resolvido);
        var lembra = await b.Chamado(AguardandoAluno);
        await b.Recuar(fecha, TimeSpan.FromDays(7));
        await b.Recuar(rejeita, TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));
        await AguardandoHa(padrao, b, lembra, TimeSpan.FromDays(3));

        var r = await Rejeitar(b, rejeita);
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("O prazo de 7 dias para rejeitar a resolução terminou.", (await r.Json()).GetProperty("detail").GetString());

        await padrao.Services.GetRequiredService<Agendador>().Executar();

        Assert.Equal("Fechado automaticamente: 7 dias sem confirmação", (await b.Eventos(fecha)).Last().Detalhe);
        Assert.Contains("(até 7 dias)", await CorpoResolvido(padrao, b, fecha));
        Assert.Equal("Lembrete ao aluno: 3 dias aguardando resposta", Assert.Single(await b.Eventos(lembra), e => e.Tipo == "LEMBRETE").Detalhe);
    }
}
