namespace One.Api.Dados.Cadastros;

public class RespostaPronta : IDaInstituicao
{
    public const string MotivoTitulo = "Informe o título.";
    public const string MotivoTexto = "O texto deve ter de 1 a 4000 caracteres.";

    RespostaPronta() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long SetorId { get; private set; }
    public string Titulo { get; private set; } = "";
    public string Texto { get; private set; } = "";

    public static Invalido? Validar(string? titulo, string? texto)
    {
        if (string.IsNullOrWhiteSpace(titulo) || titulo.Length > 200) return new Invalido(MotivoTitulo);
        return string.IsNullOrWhiteSpace(texto) || texto.Length > 4000 ? new Invalido(MotivoTexto) : null;
    }

    public static RespostaPronta Criar(long setorId, string titulo, string texto) => new() { SetorId = setorId, Titulo = titulo, Texto = texto };

    public void Alterar(long setorId, string titulo, string texto) => (SetorId, Titulo, Texto) = (setorId, titulo, texto);
}
