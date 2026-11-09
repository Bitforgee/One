using One.Api.Chamados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class PermissoesChamadoTests
{
    static readonly string[] Estados = [Aberto, EmAtendimento, AguardandoAluno, Resolvido, Fechado];
    static readonly string[] Acoes = ["responder", "nota", "assumir", "resolver", "confirmar", "rejeitar", "cancelar", "encaminhar", "reclassificar", "duplicado", "subir"];
    static readonly string[] Abertos = [Aberto, EmAtendimento, AguardandoAluno];
    static readonly string[] NaoFechados = [Aberto, EmAtendimento, AguardandoAluno, Resolvido];

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
        [("subir", "ATENDENTE")] = Abertos,
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
        Assert.Equal(110, celulas);

        var doResponsavel = PermissoesChamado.Acoes(Aberto, "ATENDENTE", responsavelId: 7, usuarioId: 7).ToList();
        Assert.Equal(["duplicado", "encaminhar", "nota", "reclassificar", "resolver", "responder", "subir"], doResponsavel.Order());
        Assert.Contains("assumir", PermissoesChamado.Acoes(Aberto, "ATENDENTE", responsavelId: 8, usuarioId: 7));

        Assert.Null(PermissoesChamado.Estados("confirmar", "ATENDENTE"));
        Assert.Equal([Resolvido], PermissoesChamado.Estados("confirmar", "ALUNO"));
    }

    [Fact]
    public void Subir_so_para_atendente_e_lider()
    {
        foreach (var papel in new[] { "ALUNO", "ATENDENTE", "LIDER" })
            foreach (var estado in Estados)
            {
                var vale = papel != "ALUNO" && Abertos.Contains(estado);
                Assert.True(vale == PermissoesChamado.Acoes(estado, papel, null, 7).Contains("subir"), $"subir / {papel} / {estado}: esperado {vale}");
            }

        Assert.Equal(Abertos, PermissoesChamado.Estados("subir", "ATENDENTE"));
        Assert.Equal(Abertos, PermissoesChamado.Estados("subir", "LIDER"));
        Assert.Null(PermissoesChamado.Estados("subir", "ALUNO"));
    }

    [Fact]
    public void Lider_tem_cinco_acoes()
    {
        Assert.Equal(["assumir", "nota", "resolver", "responder", "subir"],
            Estados.SelectMany(e => PermissoesChamado.Acoes(e, "LIDER", null, 7)).Distinct().Order());
        foreach (var negada in new[] { "reclassificar", "duplicado", "encaminhar", "confirmar", "rejeitar", "cancelar" })
            Assert.Null(PermissoesChamado.Estados(negada, "LIDER"));
        Assert.Equal(Abertos, PermissoesChamado.Estados("responder", "LIDER"));
        Assert.Equal(NaoFechados, PermissoesChamado.Estados("nota", "LIDER"));
        Assert.Equal(Abertos, PermissoesChamado.Estados("assumir", "LIDER"));
        Assert.Equal(Abertos, PermissoesChamado.Estados("resolver", "LIDER"));
    }
}
