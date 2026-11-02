using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using One.Api.Acesso;
using One.Api.Dados;

namespace One.Api.Administracao;

public record UsuarioIn(string? Cpf, string? Nome, string? Email, string? SenhaTemporaria, string[]? Papeis, long[]? Setores);

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

    public static async Task<object> Saida(OneDb db, Usuario u) => new
    {
        id = u.Id,
        cpf = u.Cpf,
        nome = u.Nome,
        email = u.Email,
        ativo = u.Ativo,
        deveTrocarSenha = u.DeveTrocarSenha,
        papeis = u.Papeis.Select(p => p.Papel),
        setores = await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId).ToListAsync(),
    };

    // 400 nos campos, 409 em CPF ou e-mail repetidos na instituição (AC 108, AC 109).
    public static async Task<IResult?> Validar(OneDb db, UsuarioIn i, long id) =>
        Pessoa(i) ?? await PapeisESetores(db, i) ?? await Repetidos(db, i, id);

    static IResult? Pessoa(UsuarioIn i)
    {
        if (Cpf.Normalizar(i.Cpf) is null) return Problemas.Invalido("CPF inválido.", "cpf");
        if (!AdminRotas.Nome(i.Nome, 200)) return Problemas.Invalido("Informe o nome.", "nome");
        if (i.Email is null || !Email.Valido().IsMatch(i.Email)) return Problemas.Invalido("E-mail inválido.", "email");
        return null;
    }

    static async Task<IResult?> PapeisESetores(OneDb db, UsuarioIn i)
    {
        if (i.Papeis is not { Length: > 0 } || i.Papeis.Any(p => !PapeisValidos.Contains(p))) return Problemas.Invalido("Escolha ao menos um papel.", "papeis");
        var setores = i.Setores ?? [];
        if (i.Papeis.Contains(Papeis.Atendente) && setores.Length == 0) return Problemas.Invalido("Escolha ao menos um setor para o atendente.", "setores");
        if (await db.Setores.CountAsync(s => setores.Contains(s.Id)) != setores.Distinct().Count()) return Problemas.Invalido("Setor inexistente.", "setores");
        if (i.SenhaTemporaria is not null && !Senha.Valida(i.SenhaTemporaria))
            return Problemas.Invalido($"A senha temporária deve ter de {Senha.Minimo} a {Senha.Maximo} caracteres.", "senhaTemporaria");
        return null;
    }

    static async Task<IResult?> Repetidos(OneDb db, UsuarioIn i, long id)
    {
        var cpf = Cpf.Normalizar(i.Cpf);
        if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Cpf == cpf)) return AdminRotas.Repetido("Já existe um usuário com este CPF na instituição.");
        if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Email == i.Email)) return AdminRotas.Repetido("Já existe um usuário com este e-mail na instituição.");
        return null;
    }

    // Grava o usuário, os papéis e os setores num SaveChanges só (AC 30 do refatoracao-solid).
    public static async Task Gravar(OneDb db, Usuario u, UsuarioIn i, IPasswordHasher<Usuario> hasher)
    {
        u.Cpf = Cpf.Normalizar(i.Cpf)!;
        u.Nome = i.Nome!;
        u.Email = i.Email!;
        u.Papeis.RemoveAll(p => !i.Papeis!.Contains(p.Papel));
        u.Papeis.AddRange(i.Papeis!.Distinct().Where(p => !u.Tem(p)).Select(p => new UsuarioPapel { Papel = p }));
        if (i.SenhaTemporaria is not null)
        {
            u.SenhaHash = hasher.HashPassword(u, i.SenhaTemporaria);
            u.DeveTrocarSenha = true; // AC 110
        }
        await Setores(db, u, i.Papeis!.Contains(Papeis.Atendente) ? i.Setores!.Distinct().ToList() : []);
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
