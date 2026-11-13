namespace One.Api.Dados.Cadastros;

public class Categoria : IDaInstituicao
{
    public const string MotivoNome = "Informe o nome da categoria.";
    public const string MotivoPadrao = "A categoria \"Não classificado\" não pode ser renomeada nem desativada.";

    Categoria() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; private set; } = "";
    public bool Ativa { get; private set; } = true;
    public bool Padrao { get; private set; }

    public static Invalido? Validar(string? nome, bool? ativa, Categoria? atual = null)
    {
        if (string.IsNullOrWhiteSpace(nome) || nome.Length > 100) return new Invalido(MotivoNome);
        return atual is { Padrao: true } && (nome != atual.Nome || ativa == false) ? new Invalido(MotivoPadrao) : null;
    }

    public static Categoria Criar(string nome, bool? ativa = null) => new() { Nome = nome, Ativa = ativa ?? true };

    public static Categoria CriarPadrao() => new() { Nome = "Não classificado", Padrao = true };

    public void Alterar(string nome, bool? ativa) => (Nome, Ativa) = (nome, ativa ?? true);
}
