namespace One.Api.Dados;

public class Instituicao
{
    Instituicao() { }

    public long Id { get; private set; }
    public string Slug { get; private set; } = "";
    public string Nome { get; private set; } = "";
    public string Fuso { get; private set; } = "";
    public bool Ativa { get; private set; } = true;
    public DateTime CriadaEm { get; private set; }
    public long UltimoNumeroChamado { get; private set; }

    public string? NomeCurto { get; private set; }
    public string? Cor { get; private set; }
    public string? LoginTitulo { get; private set; }
    public string? LoginFrase { get; private set; }
    public string[]? LoginItens { get; private set; }
    public string? AssistenteNome { get; private set; }
    public string? AssistenteBoasVindas { get; private set; }
    public string[]? AssistentePerguntas { get; private set; }
    public string? ContatoHorario { get; private set; }
    public string? ContatoTelefone { get; private set; }
    public string? ContatoEmail { get; private set; }

    public static Instituicao Criar(string slug, string nome, string fuso, DateTime agora) =>
        new() { Slug = slug, Nome = nome, Fuso = fuso, CriadaEm = agora };

    public void Desativar() => Ativa = false;

    public void Reativar() => Ativa = true;

    public void AlterarAparencia(DadosDeAparencia a)
    {
        (NomeCurto, Cor) = (a.NomeCurto, a.Cor);
        (LoginTitulo, LoginFrase, LoginItens) = (a.LoginTitulo, a.LoginFrase, Itens(a.LoginItens));
        (AssistenteNome, AssistenteBoasVindas, AssistentePerguntas) = (a.AssistenteNome, a.AssistenteBoasVindas, Itens(a.AssistentePerguntas));
        (ContatoHorario, ContatoTelefone, ContatoEmail) = (a.ContatoHorario, a.ContatoTelefone, a.ContatoEmail);
    }

    static string[]? Itens(IReadOnlyList<string>? l) => l is { Count: > 0 } ? [.. l] : null;
}