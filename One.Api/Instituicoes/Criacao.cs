using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Dados.Emails;

namespace One.Api.Instituicoes;

public record NovaInstituicao(string Slug, string Nome, string Fuso, string? Cpf, string AdminNome, string Email);

public record ErroDeCampo(string Campo, string Mensagem, bool Repetido = false);

public static partial class Criacao
{
    [GeneratedRegex("^[a-z0-9-]{3,30}$")] private static partial Regex SlugValido();

    public static async Task<List<ErroDeCampo>> Validar(OneDb db, NovaInstituicao n)
    {
        var erros = new List<ErroDeCampo>();
        if (!SlugValido().IsMatch(n.Slug)) erros.Add(new("slug", $"\"{n.Slug}\" deve casar com ^[a-z0-9-]{{3,30}}$"));
        else if (await db.Instituicoes.AnyAsync(i => i.Slug == n.Slug)) erros.Add(new("slug", $"\"{n.Slug}\" já existe", Repetido: true));
        if (n.Nome == "") erros.Add(new("nome", "obrigatório"));
        if (!(TimeZoneInfo.TryFindSystemTimeZoneById(n.Fuso, out var tz) && tz.HasIanaId)) erros.Add(new("fuso", $"\"{n.Fuso}\" não é um fuso IANA (ex.: America/Cuiaba)"));
        if (n.Cpf is null) erros.Add(new("admin.cpf", "CPF inválido"));
        if (n.AdminNome == "") erros.Add(new("admin.nome", "obrigatório"));
        if (!Email.Valido().IsMatch(n.Email)) erros.Add(new("admin.email", $"\"{n.Email}\" não é um e-mail válido"));
        return erros;
    }

    public static async Task<(Instituicao, string)> Gravar(OneDb db, NovaInstituicao n, DateTime agora, IConfiguration? cfg)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var instituicao = new Instituicao { Slug = n.Slug, Nome = n.Nome, Fuso = n.Fuso, CriadaEm = agora };
        db.Instituicoes.Add(instituicao);
        await db.SaveChangesAsync();
        db.InstituicaoAtual = instituicao.Id;

        db.Setores.Add(new Setor { Nome = "Triagem", Triagem = true });
        db.Categorias.Add(new Categoria { Nome = "Não classificado", Padrao = true });
        var admin = new Usuario { Cpf = n.Cpf!, Nome = n.AdminNome, Email = n.Email, Papeis = [new UsuarioPapel { Papel = Papeis.Administrador }] };
        db.Usuarios.Add(admin);
        await db.SaveChangesAsync();
        var (token, registro) = Tokens.Novo(n.Slug, admin.Id, agora);
        db.Tokens.Add(registro);
        if (cfg is not null) db.EmailsSaida.Add(EmailDeAcesso(cfg, instituicao, admin.Email, token, agora));
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return (instituicao, token);
    }

    public static EmailSaida EmailDeAcesso(IConfiguration cfg, Instituicao i, string para, string token, DateTime agora) => new()
    {
        Destinatario = para,
        Assunto = $"[{i.Nome}] Crie sua senha",
        Corpo = $"Você é administrador de {i.Nome} no One.\n\nPara criar sua senha, abra o link abaixo (vale 60 minutos):\n{Tokens.Link(cfg, i.Slug, token)}\n",
        ProximaTentativa = agora,
    };
}
