namespace One.Api.Dados.Cadastros;

public class Categoria : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; set; } = "";
    public bool Ativa { get; set; } = true;
    public bool Padrao { get; set; }
}
