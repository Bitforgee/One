namespace One.Api.Dados.Fluxos;

public static class DestinosEtapa
{
    public const string Setor = "SETOR";
    public const string CoordenacaoCurso = "COORDENACAO_CURSO";
    public const string LiderancaSemestre = "LIDERANCA_SEMESTRE";

    public static readonly string[] Todos = [Setor, CoordenacaoCurso, LiderancaSemestre];

    public static bool PedeCiencia(string destino) => destino == LiderancaSemestre;

    public static bool VeTudo(string destino) => destino != LiderancaSemestre;
}
