using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

// Carga gravada direto no banco, com horários exatos; a Univag fica em America/Cuiaba (UTC-4).
public class IndicadoresTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly DateTime Base = new(2026, 11, 10, 12, 0, 0, DateTimeKind.Utc); // 10/11 08:00 em Cuiabá
    const string Periodo = "de=2026-11-10&ate=2026-11-10";

    record Mundo(Instituicao I, HttpClient Admin, Setor Triagem, Setor Financeiro, Categoria CatFinanceiro, Categoria CatSecretaria, long ArtigoFinanceiro, Usuario Atendente);

    async Task<Mundo> Criar()
    {
        var (i, admin) = await Admin.Criar(f);
        var triagem = await f.Db(i.Id, db => db.Setores.SingleAsync());
        var financeiro = await f.Setor(i, "Financeiro");
        var catFin = await f.Categoria(i, "Financeiro");
        var catSec = await f.Categoria(i, "Secretaria");
        var artigo = await f.Artigo(i, "Boleto", "O boleto fica no portal.", categoriaId: catFin.Id);
        var atendente = await f.Usuario(i, [Papeis.Atendente]);
        return new Mundo(i, admin, triagem, financeiro, catFin, catSec, artigo.Id, atendente);
    }

    // Conversa com mensagens do assistente com os tipos finais dados; citar = categoria pelo artigo citado.
    Task<Conversa> Conversa(Mundo m, Usuario aluno, DateTime em, string? desfecho, string[] tipos, bool citar = false) =>
        f.Db(m.I.Id, async db =>
        {
            var c = new Conversa { AlunoId = aluno.Id, CriadaEm = em, UltimaMensagemEm = em, Desfecho = desfecho, DesfechoEm = desfecho is null ? null : em };
            c.Mensagens.Add(new MensagemConversa { Autor = "ALUNO", Texto = "MENSAGEM-SECRETA do aluno", CriadaEm = em });
            var versao = await db.VersoesArtigo.Where(v => v.ArtigoId == m.ArtigoFinanceiro).Select(v => v.Id).SingleAsync();
            foreach (var t in tipos)
                c.Mensagens.Add(new MensagemConversa
                {
                    Autor = "ASSISTENTE", Texto = "texto", TipoFinal = t, CriadaEm = em,
                    Citacoes = t == "resposta" && citar ? [new CitacaoArtigo { VersaoArtigoId = versao, Trechos = ["o portal"] }] : [],
                });
            db.Conversas.Add(c);
            await db.SaveChangesAsync();
            return c;
        });

    // Chamado com transições (horas depois da criação, de, para) e primeira resposta pública do atendente.
    Task<Chamado> Chamado(Mundo m, Conversa conversa, Usuario aluno, DateTime criado, Categoria categoria, Setor setor, string estado,
        (double h, string de, string para)[] transicoes, double? respostaEmHoras = null, string? motivo = null, int reaberturas = 0, int encaminhamentos = 0) =>
        f.Db(m.I.Id, async db =>
        {
            var numero = await db.Database.SqlQuery<long>($"UPDATE instituicao SET ultimo_numero_chamado = ultimo_numero_chamado + 1 WHERE id = {m.I.Id} RETURNING ultimo_numero_chamado AS \"Value\"").ToListAsync();
            var c = One.Api.Dados.Chamados.Chamado.Abrir($"ONE-{numero.Single()}", conversa.Id, aluno.Id, await db.Matriculas.Where(x => x.UsuarioId == aluno.Id).Select(x => x.Id).FirstAsync(),
                3, "MENSAGEM-SECRETA do aluno", null, categoria.Id, "IA", setor.Id, criado);
            // histórico fabricado: estado, motivo e contadores que só as transições gravariam
            var e = db.Entry(c);
            (e.Property(x => x.Estado).CurrentValue, e.Property(x => x.MotivoFechamento).CurrentValue) = (estado, motivo);
            (e.Property(x => x.Reaberturas).CurrentValue, e.Property(x => x.Encaminhamentos).CurrentValue) = (reaberturas, encaminhamentos);
            db.Chamados.Add(c);
            await db.SaveChangesAsync();
            db.EventosChamado.AddRange(transicoes.Select(t => new EventoChamado { ChamadoId = c.Id, Tipo = "TRANSICAO", De = t.de, Para = t.para, CriadoEm = criado.AddHours(t.h) }));
            if (respostaEmHoras is { } h)
                db.MensagensChamado.Add(new MensagemChamado { ChamadoId = c.Id, AutorId = m.Atendente.Id, Tipo = "PUBLICA", Texto = "Resposta", CriadaEm = criado.AddHours(h) });
            await db.SaveChangesAsync();
            return c;
        });

    async Task<JsonElement> Pedir(HttpClient c, string consulta = Periodo)
    {
        var r = await c.GetAsync($"/api/indicadores?{consulta}");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        return await r.Json();
    }

    static double? Num(JsonElement j, string nome) => j.GetProperty(nome).ValueKind == JsonValueKind.Null ? null : j.GetProperty(nome).GetDouble();

    static List<(string, int)> Ranking(JsonElement j, string nome) =>
        j.GetProperty("principaisCategorias").GetProperty(nome).EnumerateArray().Select(x => (x.GetProperty("categoria").GetString()!, x.GetProperty("total").GetInt32())).ToList();

    [Fact]
    public async Task Quatorze_indicadores_batem_com_a_conta()
    {
        var m = await Criar();
        var (a, b, c, d) = (await f.Usuario(m.I, [Papeis.Aluno]), await f.Usuario(m.I, [Papeis.Aluno]), await f.Usuario(m.I, [Papeis.Aluno]), await f.Usuario(m.I, [Papeis.Aluno]));
        await Conversa(m, a, Base, Desfechos.Resolvida, ["resposta"], citar: true);
        await Conversa(m, a, Base, Desfechos.Abandonada, ["sem_base"]);
        var c3 = await Conversa(m, b, Base, Desfechos.Transferida, ["sem_base", "resposta"], citar: true);
        var c4 = await Conversa(m, c, Base, Desfechos.Transferida, []);
        await Conversa(m, c, Base, null, ["pergunta"]);
        var fora = await Conversa(m, d, Base.AddDays(-1), Desfechos.Resolvida, ["resposta"]);
        // h1: 2 h até a resposta, resolvido em 5 h, confirmado sem reabertura
        await Chamado(m, c3, b, Base.AddHours(1), m.CatFinanceiro, m.Financeiro, Fechado,
            [(2, Aberto, EmAtendimento), (5, EmAtendimento, Resolvido), (6, Resolvido, Fechado)], respostaEmHoras: 2, motivo: "CONFIRMADO");
        // h2: 4 h até a resposta, 2 h aguardando o aluno, reaberto e resolvido de novo em 11 h -> 9 h
        await Chamado(m, c4, c, Base.AddHours(2), m.CatSecretaria, m.Triagem, Resolvido,
            [(4, Aberto, EmAtendimento), (5, EmAtendimento, AguardandoAluno), (7, AguardandoAluno, EmAtendimento), (8, EmAtendimento, Resolvido), (9, Resolvido, EmAtendimento), (11, EmAtendimento, Resolvido)],
            respostaEmHoras: 4, reaberturas: 1, encaminhamentos: 1);
        // h3: de outro dia e ainda aberto
        await Chamado(m, fora, d, Base.AddDays(-1), m.CatSecretaria, m.Triagem, Aberto, []);

        var j = await Pedir(m.Admin);

        Assert.False(j.GetProperty("semDados").GetBoolean());
        Assert.Equal(3, j.GetProperty("alunosAtivos").GetInt32());
        Assert.Equal(5, j.GetProperty("conversas").GetInt32());
        Assert.Equal(0.25, Num(j, "taxaAutoatendimento"));
        Assert.Equal(0.5, Num(j, "taxaEscalonamento"));
        Assert.Equal(0.25, Num(j, "taxaAbandono"));
        Assert.Equal(0.4, Num(j, "taxaPerguntasSemArtigo"));
        Assert.Equal(2, j.GetProperty("chamadosAbertos").GetInt32());
        Assert.Equal(2, j.GetProperty("chamadosResolvidos").GetInt32());
        Assert.Equal(3, Num(j, "tempoPrimeiraRespostaHoras"));
        Assert.Equal(7, Num(j, "tempoResolucaoHoras"));
        Assert.Equal(0.5, Num(j, "roteamentoCorreto"));
        Assert.Equal(0.5, Num(j, "taxaReabertura"));
        Assert.Equal([("Financeiro", 2)], Ranking(j, "porConversas"));
        Assert.Equal([("Financeiro", 1), ("Secretaria", 1)], Ranking(j, "porChamados"));
        Assert.Equal(0.5, Num(j, "indicadorPrincipal"));
    }

    [Fact]
    public async Task Abandonada_nao_e_autoatendimento()
    {
        var m = await Criar();
        var a = await f.Usuario(m.I, [Papeis.Aluno]);
        await Conversa(m, a, Base, Desfechos.Abandonada, ["resposta"]);

        var j = await Pedir(m.Admin);

        Assert.Equal((0.0, 1.0, 0.0), (Num(j, "taxaAutoatendimento"), Num(j, "taxaAbandono"), Num(j, "indicadorPrincipal")));
    }

    [Fact]
    public async Task Sem_base_conta_pergunta_sem_artigo()
    {
        var m = await Criar();
        var a = await f.Usuario(m.I, [Papeis.Aluno]);
        await Conversa(m, a, Base, null, ["sem_base", "resposta"], citar: true);
        await Conversa(m, a, Base, null, ["resposta"], citar: true);

        var j = await Pedir(m.Admin);

        Assert.Equal(0.5, Num(j, "taxaPerguntasSemArtigo"));
    }

    [Fact]
    public async Task Desconta_aguardando_aluno()
    {
        var m = await Criar();
        var a = await f.Usuario(m.I, [Papeis.Aluno]);
        var conversa = await Conversa(m, a, Base, Desfechos.Transferida, []);
        await Chamado(m, conversa, a, Base, m.CatSecretaria, m.Triagem, Resolvido,
            [(1, Aberto, EmAtendimento), (3, EmAtendimento, AguardandoAluno), (7, AguardandoAluno, EmAtendimento), (10, EmAtendimento, Resolvido)]);

        Assert.Equal(6, Num(await Pedir(m.Admin), "tempoResolucaoHoras"));
    }

    [Fact]
    public async Task Atendente_ve_so_seus_setores()
    {
        var m = await Criar();
        var a = await f.Usuario(m.I, [Papeis.Aluno]);
        var outro = await f.Setor(m.I, "Secretaria");
        var cliente = (await f.Atendente(m.I, m.Financeiro)).Cliente;
        async Task Em(Setor setor, int encaminhamentos = 0, string? veioDe = null)
        {
            var ch = await Chamado(m, await Conversa(m, a, Base, Desfechos.Transferida, []), a, Base, m.CatFinanceiro, setor, Aberto, [], encaminhamentos: encaminhamentos);
            if (veioDe is not null)
                await f.Db(m.I.Id, async db => { db.EventosChamado.Add(new EventoChamado { ChamadoId = ch.Id, Tipo = "ENCAMINHAMENTO", De = veioDe, Para = setor.Nome, CriadoEm = Base }); await db.SaveChangesAsync(); });
        }
        await Em(m.Financeiro);
        await Em(outro, 1, veioDe: "Financeiro");
        await Em(outro);
        await Em(m.Triagem);

        var j = await Pedir(cliente);

        Assert.Equal(2, j.GetProperty("chamadosAbertos").GetInt32());
        Assert.Equal([("Financeiro", 2)], Ranking(j, "porChamados"));
        Assert.Equal(JsonValueKind.Null, j.GetProperty("conversas").ValueKind);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync($"/api/indicadores?{Periodo}&setorId={outro.Id}")).StatusCode);
        Assert.Equal(4, (await Pedir(m.Admin)).GetProperty("chamadosAbertos").GetInt32());
        Assert.Equal(2, (await Pedir(m.Admin, $"{Periodo}&setorId={outro.Id}")).GetProperty("chamadosAbertos").GetInt32());
    }

    [Fact]
    public async Task Aluno_403()
    {
        var aluno = await f.AlunoLogado();
        Assert.Equal(HttpStatusCode.Forbidden, (await aluno.Cliente.GetAsync($"/api/indicadores?{Periodo}")).StatusCode);
    }

    [Fact]
    public async Task Periodo_vazio_sem_dados()
    {
        var m = await Criar();

        var j = await Pedir(m.Admin);

        Assert.True(j.GetProperty("semDados").GetBoolean());
        foreach (var contagem in new[] { "alunosAtivos", "conversas", "chamadosAbertos", "chamadosResolvidos" })
            Assert.Equal(0, j.GetProperty(contagem).GetInt32());
        foreach (var taxa in new[] { "taxaAutoatendimento", "taxaEscalonamento", "taxaAbandono", "taxaPerguntasSemArtigo", "tempoPrimeiraRespostaHoras", "tempoResolucaoHoras", "roteamentoCorreto", "taxaReabertura", "indicadorPrincipal" })
            Assert.Equal(JsonValueKind.Null, j.GetProperty(taxa).ValueKind);
    }

    [Fact]
    public async Task De_depois_de_ate_400()
    {
        var m = await Criar();
        Assert.Equal(HttpStatusCode.BadRequest, (await m.Admin.GetAsync("/api/indicadores?de=2026-11-10&ate=2026-11-09")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await m.Admin.GetAsync("/api/indicadores")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await m.Admin.GetAsync("/api/indicadores?de=2026-11-10&ate=2026-11-10&setorId=999999")).StatusCode);
    }

    [Fact]
    public async Task Sem_dado_pessoal()
    {
        var m = await Criar();
        var a = await f.Usuario(m.I, [Papeis.Aluno], matricula: "2000999888");
        var conversa = await Conversa(m, a, Base, Desfechos.Transferida, ["sem_base"]);
        await Chamado(m, conversa, a, Base, m.CatFinanceiro, m.Financeiro, Aberto, []);

        var corpo = await (await m.Admin.GetAsync($"/api/indicadores?{Periodo}")).Content.ReadAsStringAsync();

        foreach (var proibido in new[] { a.Nome, a.Cpf, "2000999888", "MENSAGEM-SECRETA", a.Email })
            Assert.DoesNotContain(proibido, corpo);
    }

    // C12: 02/11 02:30 UTC ainda é 01/11 em Cuiabá.
    [Fact]
    public async Task Dia_do_periodo_no_fuso()
    {
        var m = await Criar();
        var a = await f.Usuario(m.I, [Papeis.Aluno]);
        var criado = new DateTime(2026, 11, 2, 2, 30, 0, DateTimeKind.Utc);
        await Chamado(m, await Conversa(m, a, criado, Desfechos.Transferida, []), a, criado, m.CatFinanceiro, m.Triagem, Aberto, []);

        Assert.Equal([("Financeiro", 1)], Ranking(await Pedir(m.Admin, "de=2026-11-01&ate=2026-11-01"), "porChamados"));
        Assert.Empty(Ranking(await Pedir(m.Admin, "de=2026-11-02&ate=2026-11-02"), "porChamados"));
    }
}
