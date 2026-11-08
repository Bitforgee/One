namespace One.Api.Dados.Cadastros;

public class Curso : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; set; } = "";
    public long? SetorCoordenacaoId { get; set; }
}
