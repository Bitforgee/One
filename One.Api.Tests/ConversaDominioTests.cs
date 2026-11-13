using One.Api.Dados;

namespace One.Api.Tests;

public class ConversaDominioTests
{
    static readonly DateTime Inicio = new(2026, 11, 12, 12, 0, 0, DateTimeKind.Utc);
    static readonly DateTime Depois = Inicio.AddMinutes(7);

    static Conversa Nova() => Conversa.Iniciar(3, Inicio);

    [Fact]
    public void Encerrar_grava_ENCERRADA_e_a_data()
    {
        var c = Nova();

        var recusa = c.Encerrar(Depois);

        Assert.Null(recusa);
        Assert.Equal(("ENCERRADA_PELO_ALUNO", (DateTime?)Depois), (c.Desfecho, c.DesfechoEm));
    }

    [Fact]
    public void Encerrar_com_desfecho_devolve_Recusa()
    {
        var c = Nova();
        c.Transferir(Depois);

        var recusa = c.Encerrar(Depois.AddMinutes(1));

        Assert.Equal(new Recusa("Esta conversa já foi encerrada."), recusa);
        Assert.Equal(("TRANSFERIDA", (DateTime?)Depois), (c.Desfecho, c.DesfechoEm));
    }

    [Fact]
    public void Avaliar_resolveu_grava_RESOLVIDA()
    {
        var c = Nova();

        var recusa = c.Avaliar(true, Depois);

        Assert.Null(recusa);
        Assert.Equal(("RESOLVIDA_AUTOATENDIMENTO", (DateTime?)Depois), (c.Desfecho, c.DesfechoEm));
    }

    [Fact]
    public void Avaliar_nao_resolveu_nao_muda()
    {
        var c = Nova();

        var recusa = c.Avaliar(false, Depois);

        Assert.Null(recusa);
        Assert.Equal(((string?)null, (DateTime?)null), (c.Desfecho, c.DesfechoEm));
    }

    [Fact]
    public void Avaliar_com_desfecho_devolve_Recusa()
    {
        var c = Nova();
        c.Encerrar(Depois);

        var recusa = c.Avaliar(true, Depois.AddMinutes(1));

        Assert.Equal(new Recusa("Esta conversa já foi encerrada."), recusa);
        Assert.Equal(("ENCERRADA_PELO_ALUNO", (DateTime?)Depois), (c.Desfecho, c.DesfechoEm));
    }

    [Fact]
    public void Receber_do_aluno_guarda_a_mensagem_e_avanca_a_ultima_mensagem()
    {
        var c = Nova();

        c.ReceberDoAluno("preciso do boleto", [], Depois);

        var m = Assert.Single(c.Mensagens);
        Assert.Equal(("ALUNO", "preciso do boleto", Depois), (m.Autor, m.Texto, m.CriadaEm));
        Assert.Equal(Depois, c.UltimaMensagemEm);
    }
}