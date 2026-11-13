using One.Api.Dados;
using One.Api.Dados.Fluxos;

namespace One.Api.Tests;

public class FluxoValidacaoDominioTests
{
    static readonly IReadOnlySet<long> Setores = new HashSet<long> { 7 };

    static EtapaFluxo.Dados Coordenacao(int? prazo = null) => new(DestinosEtapa.CoordenacaoCurso, null, prazo, null, null);

    static EtapaFluxo.Dados Lideranca() => new(DestinosEtapa.LiderancaSemestre, null, null, null, null);

    static Invalido? Validar(params EtapaFluxo.Dados[] etapas) => Fluxo.Validar(etapas, Setores);

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(5, true)]
    [InlineData(6, false)]
    public void Etapas_de_1_a_5(int quantidade, bool aceita)
    {
        var erro = Validar([.. Enumerable.Repeat(Coordenacao(), quantidade)]);

        Assert.Equal(aceita ? null : new Invalido("O fluxo precisa de 1 a 5 etapas."), erro);
    }

    [Fact]
    public void Etapas_ausentes_sao_invalidas()
    {
        Assert.Equal(new Invalido("O fluxo precisa de 1 a 5 etapas."), Fluxo.Validar(null, Setores));
    }

    [Theory]
    [InlineData(0, true)]
    [InlineData(1, false)]
    [InlineData(2, false)]
    public void Lideranca_so_na_primeira_e_nunca_a_ultima(int posicao, bool aceita)
    {
        var etapas = new[] { Coordenacao(), Coordenacao(), Coordenacao() };
        etapas[posicao] = Lideranca();

        Assert.Equal(aceita ? null : new Invalido("A liderança do semestre só pode ser a primeira etapa e nunca a última."), Validar(etapas));
    }

    [Fact]
    public void Lideranca_como_unica_etapa_e_a_ultima()
    {
        Assert.Equal(new Invalido("A liderança do semestre só pode ser a primeira etapa e nunca a última."), Validar(Lideranca()));
    }

    [Theory]
    [InlineData(1, false, true)]
    [InlineData(720, false, true)]
    [InlineData(0, false, false)]
    [InlineData(721, false, false)]
    [InlineData(48, true, false)]
    [InlineData(null, true, true)]
    public void Prazo_de_1_a_720_e_nunca_na_ultima(int? prazo, bool naUltima, bool aceita)
    {
        EtapaFluxo.Dados[] etapas = naUltima ? [Coordenacao(), Coordenacao(prazo)] : [Coordenacao(prazo), Coordenacao()];

        Assert.Equal(aceita ? null : new Invalido("O prazo vai de 1 a 720 horas e não vale na última etapa."), Validar(etapas));
    }

    [Fact]
    public void Destino_fora_da_lista_e_invalido()
    {
        Assert.Equal(new Invalido("O destino deve ser SETOR, COORDENACAO_CURSO ou LIDERANCA_SEMESTRE."), Validar(new EtapaFluxo.Dados("OUTRO", null, null, null, null)));
    }

    [Theory]
    [InlineData(DestinosEtapa.Setor, null, "Escolha um setor ativo da instituição.")]
    [InlineData(DestinosEtapa.Setor, 8L, "Escolha um setor ativo da instituição.")]
    [InlineData(DestinosEtapa.Setor, 7L, null)]
    [InlineData(DestinosEtapa.CoordenacaoCurso, 7L, "Só a etapa de setor leva um setor.")]
    public void Setor_so_na_etapa_de_setor_e_entre_os_ativos(string destino, long? setorId, string? motivo)
    {
        var erro = Validar(new EtapaFluxo.Dados(destino, setorId, null, null, null));

        Assert.Equal(motivo is null ? null : new Invalido(motivo), erro);
    }

    [Theory]
    [InlineData(1.0, null)]
    [InlineData(null, 1.0)]
    public void Posicao_x_y_juntas(double? x, double? y)
    {
        Assert.Equal(new Invalido("Informe x e y juntos."), Validar(new EtapaFluxo.Dados(DestinosEtapa.CoordenacaoCurso, null, null, x, y)));
    }
}
