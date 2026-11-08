namespace One.Api.Chamados;

// Único lugar com os nomes dos grupos do hub; a instituição vem sempre do usuário relido do banco, nunca do cliente (door 3).
public static class TempoRealGrupos
{
    public static string Chamado(long instituicaoId, string numero) => $"chamado:{instituicaoId}:{numero}";
    public static string Fila(long instituicaoId, long setorId) => $"fila:{instituicaoId}:{setorId}";
}
