using Vocabulario = One.Api.Dados.Usuarios.Papeis;

namespace One.Api.Dados.Usuarios;

public class Usuario : IDaInstituicao
{
    Usuario() { }

    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public Cpf Cpf { get; private set; } = Cpf.Ler("");
    public string Nome { get; private set; } = "";
    public string Email { get; private set; } = "";
    public string? SenhaHash { get; private set; }
    public bool DeveTrocarSenha { get; private set; }
    public bool Ativo { get; private set; } = true;
    public List<UsuarioPapel> Papeis { get; private set; } = [];
    public List<Matricula> Matriculas { get; private set; } = [];
    public List<AtendenteSetor> Setores { get; private set; } = [];

    public static Usuario Criar(Cpf cpf, string nome, string email, IEnumerable<string>? papeis = null) =>
        new() { Cpf = cpf, Nome = nome, Email = email, Papeis = [.. (papeis ?? []).Distinct().Select(UsuarioPapel.Criar)] };

    public bool Tem(string papel) => Papeis.Any(p => p.Papel == papel);

    public void Atualizar(DadosUsuario dados)
    {
        Cpf = dados.Cpf;
        AlterarContato(dados.Nome, dados.Email);
    }

    public void AlterarContato(string nome, string email)
    {
        Nome = nome;
        Email = email;
    }

    public void AdicionarPapel(string papel)
    {
        if (!Tem(papel)) Papeis.Add(UsuarioPapel.Criar(papel));
    }

    public void RemoverPapel(string papel) => Papeis.RemoveAll(p => p.Papel == papel);

    public void DefinirPapeis(IEnumerable<string> papeis)
    {
        var novos = papeis.Distinct().ToList();
        Papeis.RemoveAll(p => p.Papel != Vocabulario.Operador && !novos.Contains(p.Papel));
        foreach (var papel in novos) AdicionarPapel(papel);
    }

    public void VincularSetores(IEnumerable<long> setores)
    {
        var novos = setores.Distinct().ToList();
        Setores.RemoveAll(a => !novos.Contains(a.SetorId));
        Setores.AddRange(novos.Except(Setores.Select(a => a.SetorId)).Select(AtendenteSetor.Criar));
    }

    public void DefinirAcesso(IEnumerable<string> papeis, IEnumerable<long> setores)
    {
        var lista = papeis.ToList();
        DefinirPapeis(lista);
        VincularSetores(lista.Contains(Vocabulario.Atendente) ? setores : []);
    }

    public Matricula AdicionarMatricula(string numero, long cursoId, int semestre, string situacao)
    {
        var matricula = Matricula.Criar(numero, cursoId, semestre, situacao);
        Matriculas.Add(matricula);
        return matricula;
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

