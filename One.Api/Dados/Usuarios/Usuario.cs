namespace One.Api.Dados.Usuarios;

public class Usuario : IDaInstituicao
{
    Usuario() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public string Cpf { get; private set; } = "";
    public string Nome { get; private set; } = "";
    public string Email { get; private set; } = "";
    public string? SenhaHash { get; private set; }
    public bool DeveTrocarSenha { get; private set; }
    public bool Ativo { get; private set; } = true;
    public List<UsuarioPapel> Papeis { get; private set; } = [];
    public List<Matricula> Matriculas { get; private set; } = [];

    public static Usuario Criar(string cpf, string nome, string email, IEnumerable<string>? papeis = null) =>
        new() { Cpf = cpf, Nome = nome, Email = email, Papeis = [.. (papeis ?? []).Select(p => new UsuarioPapel { Papel = p })] };

    public bool Tem(string papel) => Papeis.Any(p => p.Papel == papel);

    public void Atualizar(string cpf, string nome, string email)
    {
        Cpf = cpf;
        AlterarContato(nome, email);
    }

    public void AlterarContato(string nome, string email)
    {
        Nome = nome;
        Email = email;
    }

    public void DefinirSenhaTemporaria(string hash)
    {
        SenhaHash = hash;
        DeveTrocarSenha = true;
    }

    public void DefinirSenha(string hash, TokenAcesso token, DateTime agora)
    {
        TrocarSenha(hash);
        token.Usar(agora);
    }

    public void TrocarSenha(string hash)
    {
        SenhaHash = hash;
        DeveTrocarSenha = false;
    }

    public void Desativar() => Ativo = false;
}