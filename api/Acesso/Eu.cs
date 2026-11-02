using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record Eu(Usuario Usuario, Instituicao Instituicao) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/auth/me", (HttpContext ctx, IMediator m) => m.Send(new Eu(ctx.Usuario(), ctx.Instituicao())));
}

public sealed class EuHandler(OneDb db) : IRequestHandler<Eu, IResult>
{
    public async ValueTask<IResult> Handle(Eu m, CancellationToken ct)
    {
        var u = m.Usuario;
        var i = m.Instituicao;
        var matriculas = await db.Matriculas.Where(x => x.UsuarioId == u.Id).OrderBy(x => x.Numero)
            .Select(x => new { id = x.Id, numero = x.Numero, curso = x.Curso!.Nome, semestre = x.Semestre, situacao = x.Situacao })
            .ToListAsync();
        return Results.Ok(new
        {
            id = u.Id,
            nome = u.Nome,
            cpfMascarado = Cpf.Mascarar(u.Cpf),
            papeis = u.Papeis.Select(p => p.Papel),
            deveTrocarSenha = u.DeveTrocarSenha,
            instituicao = new { slug = i.Slug, nome = i.Nome, fuso = i.Fuso },
            matriculas,
        });
    }
}
