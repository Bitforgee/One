using One.Api.Chamados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

// refatoracao-solid C21: a tabela de permissões do chamado, célula a célula, sem banco e sem HTTP.
public class PermissoesChamadoTests
{
    static readonly string[] Estados = [Aberto, EmAtendimento, AguardandoAluno, Resolvido, Fechado];
    static readonly string[] Acoes = ["responder", "nota", "assumir", "resolver", "confirmar", "rejeitar", "cancelar", "encaminhar", "reclassificar", "duplicado"];
    static readonly string[] Abertos = [Aberto, EmAtendimento, AguardandoAluno];
    static readonly string[] NaoFechados = [Aberto, EmAtendimento, AguardandoAluno, Resolvido];

    // A tabela de hoje (AC 89 do mvp-one): ação x papel -> estados em que vale; par ausente não vale em estado nenhum.
    static readonly Dictionary<(string acao, string papel), string[]> Hoje = new()
    {
        [("responder", "ALUNO")] = NaoFechados,
        [("responder", "ATENDENTE")] = Abertos,
        [("nota", "ATENDENTE")] = NaoFechados,
        [("assumir", "ATENDENTE")] = Abertos,
        [("resolver", "ATENDENTE")] = Abertos,
        [("confirmar", "ALUNO")] = [Resolvido],
        [("rejeitar", "ALUNO")] = [Resolvido],
        [("cancelar", "ALUNO")] = Abertos,
        [("encaminhar", "ATENDENTE")] = Abertos,
        [("reclassificar", "ATENDENTE")] = NaoFechados,
        [("duplicado", "ATENDENTE")] = Abertos,
    };

    [Fact]
    public void Acoes_por_papel_e_estado()
    {
        var celulas = 0;
        foreach (var papel in new[] { "ALUNO", "ATENDENTE" })
            foreach (var estado in Estados)
            {
                var permitidas = PermissoesChamado.Acoes(estado, papel, responsavelId: null, usuarioId: 7).ToList();
                foreach (var acao in Acoes)
                {
                    var esperado = Hoje.TryGetValue((acao, papel), out var estados) && estados.Contains(estado);
                    Assert.True(esperado == permitidas.Contains(acao), $"{acao} / {papel} / {estado}: esperado {esperado}");
                    celulas++;
                }
            }
        Assert.Equal(100, celulas);

        // assumir some para quem já é o responsável; as outras ações continuam
        var doResponsavel = PermissoesChamado.Acoes(Aberto, "ATENDENTE", responsavelId: 7, usuarioId: 7).ToList();
        Assert.Equal(["duplicado", "encaminhar", "nota", "reclassificar", "resolver", "responder"], doResponsavel.Order());
        Assert.Contains("assumir", PermissoesChamado.Acoes(Aberto, "ATENDENTE", responsavelId: 8, usuarioId: 7));

        // o pipeline distingue par ausente (403) de estado fora da lista (409)
        Assert.Null(PermissoesChamado.Estados("confirmar", "ATENDENTE"));
        Assert.Equal([Resolvido], PermissoesChamado.Estados("confirmar", "ALUNO"));
    }
}
