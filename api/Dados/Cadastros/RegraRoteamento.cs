namespace One.Api.Dados.Cadastros;

public class RegraRoteamento : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public long CategoriaId { get; set; }
    public string Destino { get; set; } = ""; // SETOR ou COORDENACAO_CURSO
    public long? SetorId { get; set; }
}
