namespace One.Api.Dados;

public class ImagemInstituicao : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Tipo { get; set; } = "";
    public string Conteudo { get; set; } = "";
    public long Tamanho { get; set; }
    public string Hash { get; set; } = "";
    public string Chave { get; set; } = "";
    public int Versao { get; set; }
    public DateTimeOffset? RemovidaEm { get; set; }
}
