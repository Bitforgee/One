namespace One.Api.Dados.Fluxos;

public class EtapaFluxo : IDaInstituicao
{
    EtapaFluxo() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long VersaoFluxoId { get; private set; }
    public int Ordem { get; private set; }
    public string Destino { get; private set; } = "";
    public long? SetorId { get; private set; }
    public int? PrazoHoras { get; private set; }
    public double? PosX { get; private set; }
    public double? PosY { get; private set; }

    public sealed record Dados(string Destino, long? SetorId, int? PrazoHoras, double? X, double? Y);

    internal static EtapaFluxo De(int ordem, Dados d) =>
        new() { Ordem = ordem, Destino = d.Destino, SetorId = d.SetorId, PrazoHoras = d.PrazoHoras, PosX = d.X, PosY = d.Y };
}
