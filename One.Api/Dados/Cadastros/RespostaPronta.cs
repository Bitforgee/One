namespace One.Api.Dados.Cadastros;

public class RespostaPronta : IDaInstituicao
{
    RespostaPronta() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long SetorId { get; private set; }
    public string Titulo { get; private set; } = "";
    public string Texto { get; private set; } = "";

    public static RespostaPronta Criar(long setorId, string titulo, string texto) => new() { SetorId = setorId, Titulo = titulo, Texto = texto };

    public void Alterar(long setorId, string titulo, string texto) => (SetorId, Titulo, Texto) = (setorId, titulo, texto);
}
