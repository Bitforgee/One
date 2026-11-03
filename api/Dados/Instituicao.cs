namespace One.Api.Dados;

public class Instituicao
{
    public long Id { get; set; }
    public string Slug { get; set; } = "";
    public string Nome { get; set; } = "";
    public string Fuso { get; set; } = "";
    public bool Ativa { get; set; } = true;
    public DateTime CriadaEm { get; set; }
    public long UltimoNumeroChamado { get; set; }
}
