
namespace One.Api.Chamados.Consulta;

public static class AnexoDeFormulario
{
    public const long MaxAnexo = 10 * 1024 * 1024;

    public static Task<(Arquivos.Lido?, IResult?)> Ler(IFormFile f) =>
        Arquivos.Ler(f, MaxAnexo, [Arquivos.Pdf, Arquivos.Jpeg, Arquivos.Png], $"O arquivo {f.FileName} passa de 10 MB.", $"O arquivo {f.FileName} não é PDF, JPG nem PNG.");
}
