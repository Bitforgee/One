namespace One.Api.Dados;

public sealed record DadosDeAparencia
{
    public string? NomeCurto { get; init; }
    public string? Cor { get; init; }
    public string? LoginTitulo { get; init; }
    public string? LoginFrase { get; init; }
    public IReadOnlyList<string>? LoginItens { get; init; }
    public string? AssistenteNome { get; init; }
    public string? AssistenteBoasVindas { get; init; }
    public IReadOnlyList<string>? AssistentePerguntas { get; init; }
    public string? ContatoHorario { get; init; }
    public string? ContatoTelefone { get; init; }
    public string? ContatoEmail { get; init; }
}
