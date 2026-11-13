using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class AgendadorOrdemTests
{
    static async Task<OneFactory> NovaFabrica()
    {
        var f = new OneFactory();
        await f.InitializeAsync();
        return f;
    }

    static DateTime Agora(OneFactory f) => f.Relogio.GetUtcNow().UtcDateTime;

    static async Task<long> NovaConversa(Aluno a) =>
        (await (await a.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "oi" })).Json()).GetProperty("conversaId").GetInt64();

    static async Task<string> Atendido(Cadeia c)
    {
        var numero = await c.Transferir();
        Assert.True((await c.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null)).IsSuccessStatusCode);
        return numero;
    }

    [Fact]
    public async Task Ler_devolve_os_tipos_na_ordem_da_base()
    {
        await using var f = await NovaFabrica();
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        await NovaConversa(c.Aluno);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));

        var resolvido = await Atendido(c);
        Assert.True((await c.A.Cliente.PostAsJsonAsync($"/api/chamados/{resolvido}/resolver", new { texto = "Feito." })).IsSuccessStatusCode);
        var semResposta = await Atendido(c);
        Assert.True((await Balcao.Mensagem(c.A.Cliente, semResposta, "Envie o comprovante.", aguardaAluno: true)).IsSuccessStatusCode);
        var lembrete = await Atendido(c);
        Assert.True((await Balcao.Mensagem(c.A.Cliente, lembrete, "Envie o comprovante.", aguardaAluno: true)).IsSuccessStatusCode);
        var subir = await c.Transferir();
        var agora = Agora(f);
        await f.Db(c.I.Id, async db =>
        {
            await db.Chamados.Where(x => x.Numero == resolvido).ExecuteUpdateAsync(s => s.SetProperty(x => x.ResolvidoEm, agora.AddDays(-7)));
            await db.Chamados.Where(x => x.Numero == semResposta).ExecuteUpdateAsync(s => s.SetProperty(x => x.AguardandoDesde, agora.AddDays(-10)));
            await db.Chamados.Where(x => x.Numero == lembrete).ExecuteUpdateAsync(s => s.SetProperty(x => x.AguardandoDesde, agora.AddDays(-4)));
        });
        await c.EntrouNaEtapaHa(subir, TimeSpan.FromHours(48));
        await f.SemEmbedding(c.I);
        var subscricao = await f.Subscrever(c.I, c.Aluno.Usuario);
        await f.Db(c.I.Id, async db =>
        {
            db.PushesSaida.Add(One.Api.Dados.Push.PushSaida.Criar(subscricao.Id, (await db.Chamados.SingleAsync(x => x.Numero == subir)).Id, agora));
            await db.SaveChangesAsync();
        });

        var tipos = (await c.Agendador.Ler()).Select(i => i.Tipo).ToList();

        var semRepeticao = tipos.Where((t, n) => n == 0 || t != tipos[n - 1]).ToList();
        Assert.Equal(["conversa", "chamado", "aguardando", "lembrete", "subir", "email", "trecho", "push"], semRepeticao);
    }

    [Fact]
    public async Task Trechos_sao_indexados_antes_dos_demais_itens()
    {
        await using var f = await NovaFabrica();
        var aluno = await f.AlunoLogado();
        var conversa = await NovaConversa(aluno);
        await f.SemEmbedding(aluno.Instituicao);
        f.Relogio.Advance(TimeSpan.FromMinutes(30));

        await f.Services.GetRequiredService<Agendador>().Executar();

        var mensagens = f.Logs.Entradas.Select(l => l.Mensagem).ToList();
        var indexou = mensagens.FindIndex(m => m.StartsWith("Agendador indexou") && m.Contains("trechos"));
        var abandonou = mensagens.FindIndex(m => m.Contains($"Conversa {conversa} abandonada"));
        Assert.True(indexou >= 0, "sem o log de indexação");
        Assert.True(abandonou >= 0, "sem o log de abandono");
        Assert.True(indexou < abandonou, $"indexou na posição {indexou}, abandonou na {abandonou}");
    }
}
