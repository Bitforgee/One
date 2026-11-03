namespace One.Api.Dados.Usuarios;

public class Usuario : IDaInstituicao
{
    public long Id { get; set; }
    public long InstituicaoId { get; set; }
    public string Cpf { get; set; } = "";
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string? SenhaHash { get; set; }
    public bool DeveTrocarSenha { get; set; }
    public bool Ativo { get; set; } = true;
    public List<UsuarioPapel> Papeis { get; set; } = [];
    public List<Matricula> Matriculas { get; set; } = [];

    public bool Tem(string papel) => Papeis.Any(p => p.Papel == papel);
}
