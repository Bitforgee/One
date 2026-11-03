using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Acesso;
using One.Api.Dados;

namespace One.Api.Administracao;

// AC 108 a 112: usuários da instituição, com os papéis e os setores do atendente.
public static class UsuarioRotas
{
    static readonly string[] PapeisValidos = [Papeis.Aluno, Papeis.Atendente, Papeis.Administrador];

    public static void Mapear(RouteGroupBuilder admin)
    {
        ListarUsuarios.Mapear(admin);
        CriarUsuario.Mapear(admin);
        AlterarUsuario.Mapear(admin);
        // AC 111 e 112: nada do histórico some; os chamados do atendente voltam para a fila do setor.
        DesativarUsuario.Mapear(admin);
    }

    // 400 nos campos, 409 em CPF ou e-mail repetidos na instituição (AC 108, AC 109).
    public static async Task<IResult?> Validar(OneDb db, string? cpf, string? nome, string? email, string? senhaTemporaria, string[]? papeis, long[]? setores, long id) =>
        Pessoa(cpf, nome, email) ?? await PapeisESetores(db, senhaTemporaria, papeis, setores) ?? await Repetidos(db, cpf, email, id);

    static IResult? Pessoa(string? cpf, string? nome, string? email)
    {
        if (Cpf.Normalizar(cpf) is null) return Problemas.Invalido("CPF inválido.", "cpf");
        if (!AdminRotas.Nome(nome, 200)) return Problemas.Invalido("Informe o nome.", "nome");
        if (email is null || !Email.Valido().IsMatch(email)) return Problemas.Invalido("E-mail inválido.", "email");
        return null;
    }

    static async Task<IResult?> PapeisESetores(OneDb db, string? senhaTemporaria, string[]? papeis, long[]? setoresInformados)
    {
        if (papeis is not { Length: > 0 } || papeis.Any(p => !PapeisValidos.Contains(p))) return Problemas.Invalido("Escolha ao menos um papel.", "papeis");
        var setores = setoresInformados ?? [];
        if (papeis.Contains(Papeis.Atendente) && setores.Length == 0) return Problemas.Invalido("Escolha ao menos um setor para o atendente.", "setores");
        if (await db.Setores.CountAsync(s => setores.Contains(s.Id)) != setores.Distinct().Count()) return Problemas.Invalido("Setor inexistente.", "setores");
        if (senhaTemporaria is not null && !Senha.Valida(senhaTemporaria))
            return Problemas.Invalido($"A senha temporária deve ter de {Senha.Minimo} a {Senha.Maximo} caracteres.", "senhaTemporaria");
        return null;
    }

    static async Task<IResult?> Repetidos(OneDb db, string? cpfInformado, string? email, long id)
    {
        var cpf = Cpf.Normalizar(cpfInformado);
        if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Cpf == cpf)) return AdminRotas.Repetido("Já existe um usuário com este CPF na instituição.");
        if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Email == email)) return AdminRotas.Repetido("Já existe um usuário com este e-mail na instituição.");
        return null;
    }

    // Grava o usuário, os papéis e os setores num SaveChanges só (AC 30 do refatoracao-solid).
    public static async Task Gravar(OneDb db, Usuario u, string? cpf, string? nome, string? email, string? senhaTemporaria, string[]? papeis, long[]? setores, IPasswordHasher<Usuario> hasher)
    {
        u.Cpf = Cpf.Normalizar(cpf)!;
        u.Nome = nome!;
        u.Email = email!;
        u.Papeis.RemoveAll(p => !papeis!.Contains(p.Papel));
        u.Papeis.AddRange(papeis!.Distinct().Where(p => !u.Tem(p)).Select(p => new UsuarioPapel { Papel = p }));
        if (senhaTemporaria is not null)
        {
            u.SenhaHash = hasher.HashPassword(u, senhaTemporaria);
            u.DeveTrocarSenha = true; // AC 110
        }
        await Setores(db, u, papeis!.Contains(Papeis.Atendente) ? setores!.Distinct().ToList() : []);
        await db.SaveChangesAsync();
    }

    // O vínculo de um usuário novo leva o id temporário dele; o EF troca pelo id gerado na mesma gravação.
    static async Task Setores(OneDb db, Usuario u, List<long> setores)
    {
        var atuais = await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).ToListAsync();
        db.AtendenteSetores.RemoveRange(atuais.Where(a => !setores.Contains(a.SetorId)));
        var usuarioId = db.Entry(u).Property(x => x.Id);
        foreach (var s in setores.Except(atuais.Select(a => a.SetorId)))
        {
            var vinculo = db.Entry(db.AtendenteSetores.Add(new AtendenteSetor { SetorId = s }).Entity).Property(a => a.UsuarioId);
            vinculo.CurrentValue = usuarioId.CurrentValue;
            vinculo.IsTemporary = usuarioId.IsTemporary;
        }
    }
}
