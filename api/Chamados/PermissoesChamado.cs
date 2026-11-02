using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

// AC 89: ação x papel no chamado -> estados em que a ação vale. Par ausente = 403; estado fora da lista = 409.
public static class PermissoesChamado
{
    // Papel da pessoa neste chamado: o aluno solicitante ou um atendente do setor atual.
    public const string Aluno = "ALUNO";
    public const string Atendente = "ATENDENTE";

    static readonly string[] Abertos = [Aberto, EmAtendimento, AguardandoAluno];
    static readonly string[] NaoFechados = [.. Abertos, Resolvido];

    static readonly Dictionary<(string acao, string papel), string[]> Permitidas = new()
    {
        [("responder", Aluno)] = NaoFechados, // em RESOLVIDO vale como rejeição (AC 86)
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

    // Estados em que a ação vale para o papel; null quando o papel nunca pode fazê-la.
    public static string[]? Estados(string acao, string papel) => Permitidas.GetValueOrDefault((acao, papel));

    // Ações que a tela oferece; "assumir" some para quem já é o responsável.
    public static IEnumerable<string> Acoes(string estado, string papel, long? responsavelId, long usuarioId) =>
        Permitidas.Where(p => p.Key.papel == papel && p.Value.Contains(estado))
            .Select(p => p.Key.acao)
            .Where(a => a != "assumir" || responsavelId != usuarioId);
}
