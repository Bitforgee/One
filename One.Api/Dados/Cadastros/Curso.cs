namespace One.Api.Dados.Cadastros;

public class Curso : IDaInstituicao
{
    public const string MotivoNome = "Informe o nome do curso.";

    Curso() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; private set; } = "";
    public long? SetorCoordenacaoId { get; private set; }

    public static Invalido? Validar(string? nome) => string.IsNullOrWhiteSpace(nome) || nome.Length > 200 ? new Invalido(MotivoNome) : null;

    public static Curso Criar(string nome, long? setorCoordenacaoId = null) => new() { Nome = nome, SetorCoordenacaoId = setorCoordenacaoId };

    public void Alterar(string nome, long? setorCoordenacaoId) => (Nome, SetorCoordenacaoId) = (nome, setorCoordenacaoId);

    public void DefinirCoordenacao(long? setorId) => SetorCoordenacaoId = setorId;
}
