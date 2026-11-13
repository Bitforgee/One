namespace One.Api.Dados.Conversas;

public class Conversa : IDaInstituicao
{
    const string JaEncerrada = "Esta conversa já foi encerrada.";

    Conversa() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long AlunoId { get; private set; }
    public DateTime CriadaEm { get; private set; }
    public DateTime UltimaMensagemEm { get; private set; }
    public string? Desfecho { get; private set; }
    public DateTime? DesfechoEm { get; private set; }
    public List<MensagemConversa> Mensagens { get; private set; } = [];

    public static Conversa Iniciar(long alunoId, DateTime agora) =>
        new() { AlunoId = alunoId, CriadaEm = agora, UltimaMensagemEm = agora };

    public void ReceberDoAluno(string texto, List<AnexoConversa> anexos, DateTime agora)
    {
        Mensagens.Add(MensagemConversa.DoAluno(texto, anexos, agora));
        UltimaMensagemEm = agora;
    }

    public void Registrar(MensagemConversa mensagem) => Mensagens.Add(mensagem);

    public Recusa? Encerrar(DateTime agora)
    {
        if (Desfecho is not null) return new Recusa(JaEncerrada);
        Concluir(Desfechos.Encerrada, agora);
        return null;
    }

    public Recusa? Avaliar(bool resolveu, DateTime agora)
    {
        if (Desfecho is not null) return new Recusa(JaEncerrada);
        if (resolveu) Concluir(Desfechos.Resolvida, agora);
        return null;
    }

    public void Transferir(DateTime agora) => Concluir(Desfechos.Transferida, agora);

    public void Abandonar(DateTime agora) => Concluir(Desfechos.Abandonada, agora);

    void Concluir(string desfecho, DateTime agora)
    {
        Desfecho = desfecho;
        DesfechoEm = agora;
    }
}