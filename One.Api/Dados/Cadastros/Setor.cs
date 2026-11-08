namespace One.Api.Dados.Cadastros;

public class Setor : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; set; } = "";
    public bool Triagem { get; set; }
    public bool Ativo { get; set; } = true;
}
