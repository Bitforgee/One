namespace One.Api.Dados;

public class ImagemInstituicao : IDaInstituicao
{
    ImagemInstituicao() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Tipo { get; private set; } = "";
    public string Conteudo { get; private set; } = "";
    public long Tamanho { get; private set; }
    public string Hash { get; private set; } = "";
    public string Chave { get; private set; } = "";
    public int Versao { get; private set; }
    public DateTimeOffset? RemovidaEm { get; private set; }

    public static ImagemInstituicao Criar(string tipo) => new() { Tipo = tipo };

    public void Substituir(string conteudo, long tamanho, string hash, string chave)
    {
        (Conteudo, Tamanho, Hash, Chave, Versao) = (conteudo, tamanho, hash, chave, Versao + 1);
        RemovidaEm = null;
    }

    public void Remover(DateTimeOffset agora) => RemovidaEm = agora;
}