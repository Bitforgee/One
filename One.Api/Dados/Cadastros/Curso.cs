namespace One.Api.Dados.Cadastros;

public class Curso : IDaInstituicao
{
    Curso() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Nome { get; private set; } = "";
    public long? SetorCoordenacaoId { get; private set; }

    public static Curso Criar(string nome, long? setorCoordenacaoId = null) => new() { Nome = nome, SetorCoordenacaoId = setorCoordenacaoId };

    public void Alterar(string nome, long? setorCoordenacaoId) => (Nome, SetorCoordenacaoId) = (nome, setorCoordenacaoId);

    public void DefinirCoordenacao(long? setorId) => SetorCoordenacaoId = setorId;
}
