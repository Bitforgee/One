namespace One.Api.Chamados.TempoReal;

public static class TempoRealGrupos
{
    public static string Chamado(long instituicaoId, string numero) => $"chamado:{instituicaoId}:{numero}";
    public static string Fila(long instituicaoId, long setorId) => $"fila:{instituicaoId}:{setorId}";
}
