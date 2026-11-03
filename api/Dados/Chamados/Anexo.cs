namespace One.Api.Dados.Chamados;

public class Anexo : IDaInstituicao
{
    public long Id { get; init; }
    public long InstituicaoId { get; set; }
    public long MensagemChamadoId { get; init; }
    public string Nome { get; init; } = "";
    public string Tipo { get; init; } = ""; // Content-Type conferido pela assinatura (door 13)
    public long Tamanho { get; init; }
    // shortcut: conteúdo em bytea (door 13), lido inteiro na memória; com GBs de anexos ou muitos downloads simultâneos, mover para armazenamento de objetos (S3/MinIO) com streaming
    public byte[] Conteudo { get; init; } = [];
}
