using Microsoft.EntityFrameworkCore;
using One.Api.Acesso;
using One.Api.Dados;

namespace One.Api.Administracao.Usuarios;

public static class ValidacaoDeUsuario
{
    static readonly string[] PapeisValidos = [Papeis.Aluno, Papeis.Atendente, Papeis.Administrador];

    public static async Task<IResult?> Validar(OneDb db, string? cpf, string? nome, string? email, string? senhaTemporaria, string[]? papeis, long[]? setores, long id) =>
        Pessoa(cpf, nome, email) ?? await PapeisESetores(db, senhaTemporaria, papeis, setores) ?? await Repetidos(db, cpf, email, id);

    public static bool Nome(string? nome, int max) => !string.IsNullOrWhiteSpace(nome) && nome.Length <= max;

    static IResult? Pessoa(string? cpf, string? nome, string? email)
    {
        if (Cpf.Tentar(cpf) is null) return Problemas.Invalido("CPF inválido.", "cpf");
        if (!Nome(nome, 200)) return Problemas.Invalido("Informe o nome.", "nome");
        if (email is null || !EnviadorSmtp.Valido().IsMatch(email)) return Problemas.Invalido("E-mail inválido.", "email");
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
        var cpf = Cpf.Tentar(cpfInformado);
        if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Cpf == cpf)) return ErrosDeAdmin.Repetido("Já existe um usuário com este CPF na instituição.");
        if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Email == email)) return ErrosDeAdmin.Repetido("Já existe um usuário com este e-mail na instituição.");
        return null;
    }
}
