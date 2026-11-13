namespace One.Api.Dados.Conversas;

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

    public static AnexoConversa Criar(string nome, string tipo, long tamanho, string chave, string hash) =>
        new() { Nome = nome, Tipo = tipo, Tamanho = tamanho, Chave = chave, Hash = hash };
}
