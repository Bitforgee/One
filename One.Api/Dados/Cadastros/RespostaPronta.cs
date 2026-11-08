namespace One.Api.Dados.Cadastros;

public class RespostaPronta : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long SetorId { get; set; }
    public string Titulo { get; set; } = "";
    public string Texto { get; set; } = "";
}
