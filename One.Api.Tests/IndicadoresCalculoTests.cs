using One.Api.Dados;
using One.Api.Indicadores;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Tests;

public class IndicadoresCalculoTests
{
    static readonly DateTime Base = new(2026, 11, 10, 12, 0, 0, DateTimeKind.Utc);
    static readonly DateOnly Dia = new(2026, 11, 10);
    static readonly TimeZoneInfo Cuiaba = TimeZoneInfo.FindSystemTimeZoneById("America/Cuiaba");
    const long Atendente = 900, CatFinanceiro = 1, CatSecretaria = 2, Triagem = 10, Financeiro = 11;
    static readonly Dictionary<long, string> Categorias = new() { [CatFinanceiro] = "Financeiro", [CatSecretaria] = "Secretaria" };

    static long ultimoEvento;

    static IEnumerable<EventoChamado> Transicoes(long chamado, DateTime criado, params (double h, string de, string para)[] t) =>
        t.Select(x => new EventoChamado { Id = ++ultimoEvento, ChamadoId = chamado, Tipo = "TRANSICAO", De = x.de, Para = x.para, CriadoEm = criado.AddHours(x.h) });

    static ChamadoLido Chamado(long id, DateTime criado, string estado, long categoria, long setor, long aluno, string? motivo = null, int reaberturas = 0, int encaminhamentos = 0) =>
        new(id, criado, estado, motivo, reaberturas, encaminhamentos, categoria, setor, aluno);

    [Fact]
    public void Resolucao_desconta_aguardando()
    {
        var chamado = Chamado(1, Base, Resolvido, CatSecretaria, Triagem, aluno: 100);
        var eventos = Transicoes(1, Base, (1, Aberto, EmAtendimento), (3, EmAtendimento, AguardandoAluno), (7, AguardandoAluno, EmAtendimento), (10, EmAtendimento, Resolvido)).ToList();

        var r = CalculoIndicadores.Calcular(new Massa([chamado], eventos, [], [], [], Categorias), Dia, Dia, Cuiaba, null);

        Assert.Equal(6, r.TempoResolucaoHoras);
    }

    [Fact]
    public void Subida_nao_derruba_o_roteamento_correto()
    {
        var subiu = One.Api.Dados.Chamados.Chamado.Abrir(new("ONE-1", "Duvida", null, new(1, 100, 3, 4), new(CatSecretaria, "IA", Triagem, VersaoFluxoId: 5, EtapaOrdem: 1)), Base);
        subiu.Assumir(Atendente, null, "Ana", Base.AddHours(1));
        subiu.Subir(Atendente, new(Financeiro, "Líderes", "Coordenação", "Ana"), 2, "A coordenação resolve", Base.AddHours(2));
        subiu.Resolver(Atendente, "Beto", "Resolvido pela coordenação.", Base.AddHours(3));
        var encaminhado = One.Api.Dados.Chamados.Chamado.Abrir(new("ONE-2", "Duvida", null, new(2, 101, 3, 4), new(CatSecretaria, "IA", Triagem)), Base);
        encaminhado.Encaminhar(Atendente, new(Financeiro, "Triagem", "Financeiro", null), "Não é daqui", Base.AddHours(2));
        encaminhado.Resolver(Atendente, "Beto", "Resolvido pelo financeiro.", Base.AddHours(3));

        double? Roteamento(One.Api.Dados.Chamados.Chamado c) => CalculoIndicadores.Calcular(
            new Massa([new ChamadoLido(0, Base, c.Estado, c.MotivoFechamento, c.Reaberturas, c.Encaminhamentos, c.CategoriaOriginalId, c.SetorId, c.SolicitanteId)], [.. c.Eventos], [], [], [], Categorias),
            Dia, Dia, Cuiaba, null).RoteamentoCorreto;

        Assert.Equal((Resolvido, 0), (subiu.Estado, subiu.Encaminhamentos));
        Assert.Equal(1.0, Roteamento(subiu));
        Assert.Equal(0.0, Roteamento(encaminhado));
    }

    [Fact]
    public void Os_14_iguais_aos_da_rota()
    {
        var (a, b, c, d) = (100L, 101L, 102L, 103L);
        var conversas = new List<ConversaLida>
        {
            new(a, Desfechos.Resolvida, SemBase: false),
            new(a, Desfechos.Abandonada, SemBase: true),
            new(b, Desfechos.Transferida, SemBase: true),
            new(c, Desfechos.Transferida, SemBase: false),
            new(c, null, SemBase: false),
        };
        var chamados = new List<ChamadoLido>
        {
            Chamado(1, Base.AddHours(1), Fechado, CatFinanceiro, Financeiro, b, motivo: "CONFIRMADO"),
            Chamado(2, Base.AddHours(2), Resolvido, CatSecretaria, Triagem, c, reaberturas: 1, encaminhamentos: 1),
            Chamado(3, Base.AddDays(-1), Aberto, CatSecretaria, Triagem, d),
        };
        var eventos = Transicoes(1, Base.AddHours(1), (2, Aberto, EmAtendimento), (5, EmAtendimento, Resolvido), (6, Resolvido, Fechado))
            .Concat(Transicoes(2, Base.AddHours(2), (4, Aberto, EmAtendimento), (5, EmAtendimento, AguardandoAluno), (7, AguardandoAluno, EmAtendimento),
                (8, EmAtendimento, Resolvido), (9, Resolvido, EmAtendimento), (11, EmAtendimento, Resolvido))).ToList();
        var respostas = new List<RespostaLida> { new(1, Atendente, Base.AddHours(3)), new(2, Atendente, Base.AddHours(6)) };

        var r = CalculoIndicadores.Calcular(new Massa(chamados, eventos, respostas, conversas, [CatFinanceiro, CatFinanceiro], Categorias), Dia, Dia, Cuiaba, null);

        Assert.False(r.SemDados);
        Assert.Equal(3, r.AlunosAtivos);
        Assert.Equal(5, r.Conversas);
        Assert.Equal(0.25, r.TaxaAutoatendimento);
        Assert.Equal(0.5, r.TaxaEscalonamento);
        Assert.Equal(0.25, r.TaxaAbandono);
        Assert.Equal(0.4, r.TaxaPerguntasSemArtigo);
        Assert.Equal(2, r.ChamadosAbertos);
        Assert.Equal(2, r.ChamadosResolvidos);
        Assert.Equal(3, r.TempoPrimeiraRespostaHoras);
        Assert.Equal(7, r.TempoResolucaoHoras);
        Assert.Equal(0.5, r.RoteamentoCorreto);
        Assert.Equal(0.5, r.TaxaReabertura);
        Assert.Equal([new Ranking("Financeiro", 2)], r.PrincipaisCategorias.PorConversas);
        Assert.Equal([new Ranking("Financeiro", 1), new Ranking("Secretaria", 1)], r.PrincipaisCategorias.PorChamados);
        Assert.Equal(0.5, r.IndicadorPrincipal);
    }
}
