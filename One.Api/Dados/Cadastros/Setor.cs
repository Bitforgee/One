namespace One.Api.Dados.Cadastros;

public class Setor : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; set; } = "";
    public bool Triagem { get; set; }
    public bool Ativo { get; set; } = true;
    // Liderança de um semestre: os dois juntos ou nenhum. Só se gravam na criação (door 5).
    public long? CursoId { get; set; }
    public int? Semestre { get; set; }
}
