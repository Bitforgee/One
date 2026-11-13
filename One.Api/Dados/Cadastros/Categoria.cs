namespace One.Api.Dados.Cadastros;

public class Categoria : IDaInstituicao
{
    Categoria() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; private set; } = "";
    public bool Ativa { get; private set; } = true;
    public bool Padrao { get; private set; }

    public static Categoria Criar(string nome, bool? ativa = null) => new() { Nome = nome, Ativa = ativa ?? true };

    public static Categoria CriarPadrao() => new() { Nome = "Não classificado", Padrao = true };

    public void Alterar(string nome, bool? ativa) => (Nome, Ativa) = (nome, ativa ?? true);
}
