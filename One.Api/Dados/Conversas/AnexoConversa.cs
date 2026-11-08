namespace One.Api.Dados.Conversas;

// Arquivo que o aluno anexou a uma mensagem da conversa com o assistente. Append-only, como o Anexo do chamado.
public class AnexoConversa : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long MensagemConversaId { get; init; }
    public string Nome { get; init; } = "";
    public string Tipo { get; init; } = "";
    public long Tamanho { get; init; }
    public string Chave { get; init; } = "";
    public string Hash { get; init; } = "";
}
