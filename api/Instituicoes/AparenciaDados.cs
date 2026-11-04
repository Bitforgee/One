using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed record LoginAparencia(string? Titulo, string? Frase, IReadOnlyList<string>? Itens);

public sealed record AssistenteAparencia(string? Nome, string? BoasVindas, IReadOnlyList<string>? Perguntas);

public sealed record ContatoAparencia(string? Horario, string? Telefone, string? Email);

public sealed record ImagensAparencia(int? Logo, int? Icone, int? Login, int? Assistente);

public static class TiposDeImagem
{
    public const string Logo = "logo", Icone = "icone", Login = "login", Assistente = "assistente";
    public static readonly string[] Todos = [Logo, Icone, Login, Assistente];
}

// A forma da aparência que as respostas de admin e a pública repartem; cada caso de uso a herda na sua Resposta.
public record AparenciaDados(string? NomeCurto, string? Cor, LoginAparencia Login, AssistenteAparencia Assistente, ContatoAparencia Contato, ImagensAparencia Imagens)
{
    public static AparenciaDados De(Instituicao i, IEnumerable<ImagemInstituicao> imagens)
    {
        int? Versao(string tipo) => imagens.FirstOrDefault(x => x.Tipo == tipo)?.Versao;
        return new(i.NomeCurto, i.Cor,
            new LoginAparencia(i.LoginTitulo, i.LoginFrase, i.LoginItens ?? []),
            new AssistenteAparencia(i.AssistenteNome, i.AssistenteBoasVindas, i.AssistentePerguntas ?? []),
            new ContatoAparencia(i.ContatoHorario, i.ContatoTelefone, i.ContatoEmail),
            new ImagensAparencia(Versao(TiposDeImagem.Logo), Versao(TiposDeImagem.Icone), Versao(TiposDeImagem.Login), Versao(TiposDeImagem.Assistente)));
    }
}
