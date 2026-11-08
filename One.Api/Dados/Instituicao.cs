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

    // Aparência (door 1): todos opcionais; nulo é o padrão do One.
    public string? NomeCurto { get; set; }
    public string? Cor { get; set; }
    public string? LoginTitulo { get; set; }
    public string? LoginFrase { get; set; }
    public string[]? LoginItens { get; set; }
    public string? AssistenteNome { get; set; }
    public string? AssistenteBoasVindas { get; set; }
    public string[]? AssistentePerguntas { get; set; }
    public string? ContatoHorario { get; set; }
    public string? ContatoTelefone { get; set; }
    public string? ContatoEmail { get; set; }
}
