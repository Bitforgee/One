using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public static class PermissoesChamado
{
    public const string Aluno = "ALUNO";
    public const string Atendente = "ATENDENTE";

    static readonly string[] Abertos = [Aberto, EmAtendimento, AguardandoAluno];
    static readonly string[] NaoFechados = [.. Abertos, Resolvido];

    static readonly Dictionary<(string acao, string papel), string[]> Permitidas = new()
    {
        [("responder", Aluno)] = NaoFechados,
        [("responder", Atendente)] = Abertos,
        [("nota", Atendente)] = NaoFechados,
        [("assumir", Atendente)] = Abertos,
        [("resolver", Atendente)] = Abertos,
        [("confirmar", Aluno)] = [Resolvido],
        [("rejeitar", Aluno)] = [Resolvido],
        [("cancelar", Aluno)] = Abertos,
        [("encaminhar", Atendente)] = Abertos,
        [("reclassificar", Atendente)] = NaoFechados,
        [("duplicado", Atendente)] = Abertos,
    };

    public static string[]? Estados(string acao, string papel) => Permitidas.GetValueOrDefault((acao, papel));

    public static IEnumerable<string> Acoes(string estado, string papel, long? responsavelId, long usuarioId) =>
        Permitidas.Where(p => p.Key.papel == papel && p.Value.Contains(estado))
            .Select(p => p.Key.acao)
            .Where(a => a != "assumir" || responsavelId != usuarioId);
}
