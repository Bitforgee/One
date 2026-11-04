namespace One.Api.Dados;

// Uma imagem da aparência por tipo (logo, icone, login, assistente); trocar a imagem sobe a Versao e nunca apaga o objeto antigo.
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
}
