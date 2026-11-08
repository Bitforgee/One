using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using static One.Api.Tests.Infra.SementeAtendimento;

namespace One.Api.Tests.Infra;

// Uma instituição com o fluxo "Líderes, depois Coordenação" (e, se pedido, "depois Secretaria"), um aluno e um atendente em cada setor.
// As etapas são de setor fixo: a liderança de verdade chega com a S4.
public record Cadeia(OneFactory F, Instituicao I, Aluno Aluno, Categoria Duvida, Setor Lideres, Setor Coordenacao, Setor Secretaria, Atendente A, Atendente B, Atendente C)
{
    public static async Task<Cadeia> Criar(OneFactory f, int? prazoPrimeira = null, int? prazoSegunda = null, bool tresEtapas = false, long? cursoId = null, int? semestre = null)
    {
        var i = await f.Instituicao(nome: "Univag");
        var (lideres, coordenacao, secretaria) = (await f.Setor(i, "Líderes"), await f.Setor(i, "Coordenação"), await f.Setor(i, "Secretaria"));
        var duvida = await f.Categoria(i, "Dúvida");
        var etapas = new List<One.Api.Dados.Fluxos.EtapaFluxo.Dados>
        {
            Etapa(DestinosEtapa.Setor, lideres.Id, prazoPrimeira),
            Etapa(DestinosEtapa.Setor, coordenacao.Id, tresEtapas ? prazoSegunda : null),
        };
        if (tresEtapas) etapas.Add(Etapa(DestinosEtapa.Setor, secretaria.Id));
        await f.Fluxo(i, duvida, cursoId, semestre, [.. etapas]);
        return new Cadeia(f, i, await f.AlunoLogado(i), duvida, lideres, coordenacao, secretaria,
            await f.Atendente(i, lideres), await f.Atendente(i, coordenacao), await f.Atendente(i, secretaria));
    }

    public Agendador Agendador => F.Services.GetRequiredService<Agendador>();

    // O aluno conversa e transfere: o chamado nasce na primeira etapa do fluxo.
    public async Task<string> Transferir(Aluno? aluno = null, Categoria? categoria = null)
    {
        aluno ??= Aluno;
        F.Llm.Devolver(new { tipo = "pergunta", texto = "Pode detalhar?", categoriaId = (categoria ?? Duvida).Id });
        var id = (await (await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "preciso de ajuda" })).Json()).GetProperty("conversaId").GetInt64();
        var r = await aluno.Cliente.PostAsJsonAsync($"/api/conversas/{id}/transferir", new { });
        Assert.Equal(System.Net.HttpStatusCode.Created, r.StatusCode);
        return (await r.Json()).GetProperty("numero").GetString()!;
    }

    // Atendimento direto: fora de fluxo, na triagem (a instituição precisa de um atendente da triagem para ver o chamado).
    public async Task<string> Direto()
    {
        var r = await Aluno.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "Preciso de ajuda" });
        Assert.Equal(System.Net.HttpStatusCode.Created, r.StatusCode);
        return (await r.Json()).GetProperty("numero").GetString()!;
    }

    public Task<Chamado> Ler(string numero) => F.Db(I.Id, db => db.Chamados.SingleAsync(c => c.Numero == numero));

    public Task<List<EventoChamado>> Eventos(string numero) =>
        F.Db(I.Id, db => db.EventosChamado.Where(e => db.Chamados.Any(c => c.Id == e.ChamadoId && c.Numero == numero)).OrderBy(e => e.Id).ToListAsync());

    public Task<HttpResponseMessage> Subir(HttpClient c, string numero, object? motivo = null) =>
        c.PostAsJsonAsync($"/api/chamados/{numero}/subir", new { motivo = motivo ?? "A coordenação resolve" });

    public async Task<JsonElement> Detalhe(HttpClient c, string numero) => await (await c.GetAsync($"/api/chamados/{numero}")).Json();

    // Volta no tempo só a entrada na etapa: avançar o relógio 48 horas venceria também o cookie de 8 h das sessões.
    public Task EntrouNaEtapaHa(string numero, TimeSpan quanto) =>
        F.Db(I.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.EtapaDesde, F.Relogio.GetUtcNow().UtcDateTime - quanto)));
}
