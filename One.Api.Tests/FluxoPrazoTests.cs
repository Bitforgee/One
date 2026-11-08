using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

// fluxos-atendimento S3 (C51 a C55): o Agendador sobe o chamado quando o prazo da etapa vence. A entrada na etapa recua no banco
// (avançar o relógio 48 horas venceria também o cookie de 8 h das sessões).
public class FluxoPrazoTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly TimeSpan Dois = TimeSpan.FromHours(48);

    async Task<string> Atendido(Cadeia c)
    {
        var numero = await c.Transferir();
        await c.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null);
        return numero;
    }

    // C51
    [Fact]
    public async Task Sobe_no_prazo_e_nao_antes()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var aberto = await c.Transferir();
        var emAtendimento = await Atendido(c);
        var antes = await c.Transferir();
        await c.EntrouNaEtapaHa(aberto, Dois);
        await c.EntrouNaEtapaHa(emAtendimento, Dois);
        await c.EntrouNaEtapaHa(antes, Dois - TimeSpan.FromHours(1));

        await c.Agendador.Executar();

        foreach (var numero in new[] { aberto, emAtendimento })
        {
            var chamado = await c.Ler(numero);
            Assert.Equal((c.Coordenacao.Id, 2, Aberto, null), (chamado.SetorId, chamado.EtapaOrdem, chamado.Estado, chamado.ResponsavelId));
        }
        var cedo = await c.Ler(antes);
        Assert.Equal((c.Lideres.Id, 1), (cedo.SetorId, cedo.EtapaOrdem));
    }

    // C52
    [Fact]
    public async Task Subida_do_agendador_registra_o_prazo_da_etapa()
    {
        foreach (var horas in new[] { 48, 12 })
        {
            var c = await Cadeia.Criar(f, prazoPrimeira: horas);
            var numero = await Atendido(c);
            await c.EntrouNaEtapaHa(numero, TimeSpan.FromHours(horas));

            await c.Agendador.Executar();

            var eventos = await c.Eventos(numero);
            var subida = Assert.Single(eventos, e => e.Tipo == "SUBIDA");
            Assert.Equal((null, "Líderes", "Coordenação", $"Sem resposta em {horas} horas"), (subida.AtorId, subida.De, subida.Para, subida.Detalhe));
            var chamado = await c.Ler(numero);
            Assert.Equal((Aberto, null, 0), (chamado.Estado, chamado.ResponsavelId, chamado.Encaminhamentos));
            Assert.Contains(eventos, e => e is { Tipo: "ATRIBUICAO", De: not null, Para: null });
            // o Sistema não escreve nota
            Assert.Equal(0, await f.Db(c.I.Id, db => db.MensagensChamado.CountAsync(m => m.ChamadoId == chamado.Id)));
        }
    }

    // C53
    [Fact]
    public async Task Duas_subidas_simultaneas_uma_so()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48, prazoSegunda: 48, tresEtapas: true);

        // duas execuções do Agendador
        var duas = await Atendido(c);
        await c.EntrouNaEtapaHa(duas, Dois);
        await Task.WhenAll(c.Agendador.Executar(), c.Agendador.Executar());
        Assert.Equal(2, (await c.Ler(duas)).EtapaOrdem);
        Assert.Single(await c.Eventos(duas), e => e.Tipo == "SUBIDA");

        // o Agendador junto com um atendente
        var junto = await Atendido(c);
        await c.EntrouNaEtapaHa(junto, Dois);
        var respostas = await Task.WhenAll(c.Subir(c.A.Cliente, junto), Task.Run(async () => { await c.Agendador.Executar(); return new HttpResponseMessage(HttpStatusCode.NoContent); }));
        Assert.Contains(respostas[0].StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict, HttpStatusCode.NotFound });
        Assert.Equal(2, (await c.Ler(junto)).EtapaOrdem);
        Assert.Single(await c.Eventos(junto), e => e.Tipo == "SUBIDA");
    }

    // C54: a tabela de mensagens é append-only, então a entrada na etapa é que se ajusta em torno do instante em que as mensagens foram escritas
    [Fact]
    public async Task Resposta_da_equipe_na_etapa_segura_o_chamado()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var t0 = f.Relogio.GetUtcNow().UtcDateTime;
        var respondido = await Atendido(c); // a equipe respondeu em público depois de entrar na etapa: fica
        Assert.Equal(HttpStatusCode.Created, (await Balcao.Mensagem(c.A.Cliente, respondido, "Estou vendo.")).StatusCode);
        var antigo = await Atendido(c); // a equipe respondeu antes de entrar na etapa: sobe
        await Balcao.Mensagem(c.A.Cliente, antigo, "Resposta da etapa anterior.");
        var nota = await Atendido(c); // nota interna e mensagem do aluno não seguram
        await Balcao.Mensagem(c.A.Cliente, nota, "Só uma nota.", "NOTA");
        await Balcao.Mensagem(c.Aluno.Cliente, nota, "Alguém aí?");

        f.Relogio.Advance(TimeSpan.FromHours(49)); // daqui em diante só o banco e o Agendador, sem sessão
        Task Entrou(string numero, DateTime quando) => f.Db(c.I.Id, db => db.Chamados.Where(x => x.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(x => x.EtapaDesde, quando)));
        await Entrou(respondido, t0 - TimeSpan.FromHours(1));
        await Entrou(antigo, t0 + TimeSpan.FromHours(1));
        await Entrou(nota, t0 - TimeSpan.FromHours(1));

        await c.Agendador.Executar();

        Assert.Equal((c.Lideres.Id, 1), ((await c.Ler(respondido)).SetorId, (await c.Ler(respondido)).EtapaOrdem));
        Assert.Equal(2, (await c.Ler(antigo)).EtapaOrdem);
        Assert.Equal(2, (await c.Ler(nota)).EtapaOrdem);
    }

    // C55
    [Fact]
    public async Task Aguardando_aluno_nao_sobe()
    {
        var c = await Cadeia.Criar(f, prazoPrimeira: 48);
        var numero = await Atendido(c);
        await f.Db(c.I.Id, db => db.Chamados.Where(x => x.Numero == numero)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Estado, AguardandoAluno).SetProperty(x => x.AguardandoDesde, f.Relogio.GetUtcNow().UtcDateTime)));
        await c.EntrouNaEtapaHa(numero, Dois);

        await c.Agendador.Executar();

        var chamado = await c.Ler(numero);
        Assert.Equal((AguardandoAluno, c.Lideres.Id, 1), (chamado.Estado, chamado.SetorId, chamado.EtapaOrdem));
        Assert.DoesNotContain(await c.Eventos(numero), e => e.Tipo == "SUBIDA");
    }
}
