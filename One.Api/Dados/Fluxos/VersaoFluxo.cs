namespace One.Api.Dados.Fluxos;

public class VersaoFluxo : IDaInstituicao
{
    readonly List<EtapaFluxo> _etapas = [];

    VersaoFluxo() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long FluxoId { get; private set; }
    public int Numero { get; private set; }
    public DateTime? PublicadaEm { get; private set; }
    public IReadOnlyList<EtapaFluxo> Etapas => _etapas;

    internal static VersaoFluxo Nova(int numero) => new() { Numero = numero };

    internal void Substituir(IEnumerable<EtapaFluxo.Dados> etapas)
    {
        _etapas.Clear();
        _etapas.AddRange(etapas.Select((d, i) => EtapaFluxo.De(i + 1, d)));
    }

    internal void Publicar(DateTime agora) => PublicadaEm = agora;
}
