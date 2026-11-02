using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class ExtrasTests(OneFactory f) : IClassFixture<OneFactory>
{
    Agendador Agendador => f.Services.GetRequiredService<Agendador>();

    Task AguardandoHa(Balcao b, string numero, TimeSpan quanto) =>
        f.Db(b.Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s.SetProperty(c => c.AguardandoDesde, c => c.AguardandoDesde - quanto)));

    Task<List<EmailSaida>> Emails(Balcao b, string assunto) => f.Db(b.Instituicao.Id, db => db.EmailsSaida.Where(e => e.Assunto == assunto).ToListAsync());

    [Fact]
    public async Task Lembrete_no_3o_dia_uma_vez()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        var cedo = await b.Chamado(AguardandoAluno);
        await AguardandoHa(b, numero, TimeSpan.FromDays(3));
        await AguardandoHa(b, cedo, TimeSpan.FromDays(3) - TimeSpan.FromMinutes(1));

        await Agendador.Executar();
        await Agendador.Executar();

        var lembrete = Assert.Single(await Emails(b, $"[Univag] {numero} aguarda sua resposta"));
        Assert.Equal(b.Aluno.Usuario.Email, lembrete.Destinatario);
        var evento = Assert.Single(await b.Eventos(numero), e => e.Tipo == "LEMBRETE");
        Assert.Null(evento.AtorId);
        Assert.Empty(await Emails(b, $"[Univag] {cedo} aguarda sua resposta"));
        Assert.Equal(AguardandoAluno, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Resolve_no_7o_dia_aguardando()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);
        await AguardandoHa(b, numero, TimeSpan.FromDays(7));

        await Agendador.Executar();

        var c = await b.Ler(numero);
        Assert.Equal((Resolvido, f.Relogio.GetUtcNow().UtcDateTime), (c.Estado, c.ResolvidoEm));
        var m = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.Where(x => x.ChamadoId == c.Id).OrderBy(x => x.Id).LastAsync());
        Assert.Equal(("Encerrado por falta de resposta. Se ainda precisar, rejeite esta resolução.", (long?)null, "PUBLICA"), (m.Texto, m.AutorId, m.Tipo));
        var t = (await b.Eventos(numero)).Last(e => e.Tipo == "TRANSICAO");
        Assert.Equal((AguardandoAluno, Resolvido, (long?)null), (t.De, t.Para, t.AtorId));
        Assert.Single(await Emails(b, $"[Univag] {numero} foi resolvido"));

        Assert.Equal(HttpStatusCode.OK, (await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "Agora respondo." })).StatusCode);
    }

    [Fact]
    public async Task Resposta_pronta_guarda_texto_enviado()
    {
        var b = await Balcao.Criar(f);
        await f.Db(b.Instituicao.Id, async db => { db.RespostasProntas.Add(new RespostaPronta { SetorId = b.Triagem.Id, Titulo = "Boleto", Texto = "Seu boleto está no Portal do Aluno." }); await db.SaveChangesAsync(); });
        var numero = await b.Chamado();

        var r = await b.A.Cliente.GetAsync($"/api/respostas-prontas?setorId={b.Triagem.Id}");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var pronta = Assert.Single((await r.Json()).EnumerateArray());
        var editado = pronta.GetProperty("texto").GetString() + " Qualquer dúvida, responda aqui.";
        await Balcao.Mensagem(b.A.Cliente, numero, editado);
        var guardado = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.Select(m => m.Texto).SingleAsync());
        Assert.Equal(editado, guardado);
    }

    [Fact]
    public async Task Respostas_prontas_de_outro_setor_404()
    {
        var b = await Balcao.Criar(f);

        Assert.Equal(HttpStatusCode.NotFound, (await b.A.Cliente.GetAsync($"/api/respostas-prontas?setorId={b.Outro.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.ClienteAluno.GetAsync($"/api/respostas-prontas?setorId={b.Triagem.Id}")).StatusCode);
    }

    [Fact]
    public async Task Duplicado_fecha_e_sai_dos_indicadores()
    {
        var b = await Balcao.Criar(f);
        var original = await b.Chamado(descricao: "boleto");
        var repetido = await b.Chamado(descricao: "boleto de novo");
        var admin = await f.Entrar(b.Instituicao, await f.Usuario(b.Instituicao, [Papeis.Administrador]));
        var hoje = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(f.Relogio.GetUtcNow().UtcDateTime, TimeZoneInfo.FindSystemTimeZoneById("America/Cuiaba"))).ToString("yyyy-MM-dd");
        async Task<int> ChamadosNoRanking() => (await (await admin.GetAsync($"/api/indicadores?de={hoje}&ate={hoje}")).Json())
            .GetProperty("principaisCategorias").GetProperty("porChamados").EnumerateArray().Sum(x => x.GetProperty("total").GetInt32());
        Assert.Equal(2, await ChamadosNoRanking());

        var r = await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{repetido}/duplicado", new { numeroOriginal = original });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var c = await b.Ler(repetido);
        Assert.Equal((Fechado, "DUPLICADO", original), (c.Estado, c.MotivoFechamento, c.NumeroOriginal));
        var aluno = await b.Detalhe(b.ClienteAluno, repetido);
        Assert.Contains(aluno.GetProperty("mensagens").EnumerateArray(), m => m.GetProperty("texto").GetString() == $"Este pedido continua em {original}.");
        Assert.Equal(1, await ChamadosNoRanking());
    }

    [Fact]
    public async Task Original_invalido_400()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var outro = await f.AlunoLogado(b.Instituicao);
        var deOutro = (await (await outro.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "oi" })).Json()).GetProperty("numero").GetString();

        foreach (var original in new[] { numero, deOutro, "ONE-999" })
            Assert.Equal(HttpStatusCode.BadRequest, (await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/duplicado", new { numeroOriginal = original })).StatusCode);

        var c = await b.Ler(numero);
        Assert.Equal((Aberto, (string?)null), (c.Estado, c.NumeroOriginal));
    }

    [Fact]
    public async Task Duplicado_por_aluno_403_e_em_fechado_409()
    {
        var b = await Balcao.Criar(f);
        var original = await b.Chamado();
        var aberto = await b.Chamado();

        Assert.Equal(HttpStatusCode.Forbidden, (await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{aberto}/duplicado", new { numeroOriginal = original })).StatusCode);
        foreach (var estado in new[] { Resolvido, Fechado })
        {
            var numero = await b.Chamado(estado);
            Assert.Equal(HttpStatusCode.Conflict, (await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/duplicado", new { numeroOriginal = original })).StatusCode);
            Assert.Null((await b.Ler(numero)).NumeroOriginal);
        }
    }

    [Fact]
    public async Task Validade_do_artigo()
    {
        var (i, admin) = await Admin.Criar(f);
        var aluno = await f.AlunoLogado(i);
        var categoria = (await f.Categoria(i, "Acadêmico")).Id;
        var hoje = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(f.Relogio.GetUtcNow().UtcDateTime, TimeZoneInfo.FindSystemTimeZoneById("America/Cuiaba")));
        async Task Ativo(string titulo, DateOnly? de, DateOnly? ate)
        {
            var r = await admin.PostAsJsonAsync("/api/admin/artigos", new { titulo, perguntas = new[] { "?" }, categoriaId = categoria, resposta = "x", links = Array.Empty<string>(), visivelDe = de, visivelAte = ate });
            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            await admin.PostAsync($"/api/admin/artigos/{(await r.Json()).GetProperty("id").GetInt64()}/ativar", null);
        }
        await Ativo("Rematrícula 2026/1", null, hoje.AddDays(-1));
        await Ativo("Rematrícula 2026/2", hoje, null);

        await aluno.Cliente.PostAsJsonAsync("/api/conversas", new { mensagem = "rematrícula" });

        Assert.DoesNotContain("Rematrícula 2026/1", f.Llm.Corpos[^1]);
        Assert.Contains("Rematrícula 2026/2", f.Llm.Corpos[^1]);
        var invalido = await admin.PostAsJsonAsync("/api/admin/artigos", new { titulo = "x", perguntas = new[] { "?" }, categoriaId = categoria, resposta = "x", visivelDe = hoje, visivelAte = hoje.AddDays(-1) });
        Assert.Equal(HttpStatusCode.BadRequest, invalido.StatusCode);
    }
}
