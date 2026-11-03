using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public sealed record ListarChamados(string? Escopo, string? Estado, Usuario Usuario) : IRequest<IResult>
{
    // Um item de "meus chamados"; a fila do atendente tem o item próprio, com categoria, responsável e dias.
    public sealed record Resposta(string Numero, string Titulo, string Estado, DateTime CriadoEm);

    public sealed record RespostaDaFila(string Numero, string Titulo, string Categoria, string Estado, string? Responsavel, DateTime CriadoEm, int Dias);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/chamados", (string? escopo, string? estado, HttpContext ctx, IMediator m) => m.Send(new ListarChamados(escopo, estado, ctx.Usuario())));
}

public sealed class ListarChamadosHandler(OneDb db, TimeProvider relogio) : IRequestHandler<ListarChamados, IResult>
{
    public async ValueTask<IResult> Handle(ListarChamados m, CancellationToken ct)
    {
        var u = m.Usuario;
        if (m.Escopo != "fila") return Results.Ok(await Meus(u, m.Estado));
        if (!u.Tem(Papeis.Atendente)) return Results.Ok(Array.Empty<ListarChamados.Resposta>());
        return Results.Ok(await Fila(u, m.Estado, relogio.GetUtcNow().UtcDateTime));
    }

    record LinhaDaFila(string Numero, string Titulo, string Categoria, string Estado, string? Responsavel, DateTime CriadoEm);

    async Task<List<ListarChamados.Resposta>> Meus(Usuario u, string? estado) =>
        await db.Chamados.Where(c => c.SolicitanteId == u.Id && (estado == null || c.Estado == estado))
            .OrderByDescending(c => c.CriadoEm).ThenByDescending(c => c.Id)
            .Select(c => new ListarChamados.Resposta(c.Numero, c.Titulo, c.Estado, c.CriadoEm))
            .ToListAsync();

    // Fila dos setores do atendente, do mais antigo para o mais novo.
    async Task<List<ListarChamados.RespostaDaFila>> Fila(Usuario u, string? estado, DateTime agora)
    {
        var setores = db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId);
        var fila = await db.Chamados
            .Where(c => setores.Contains(c.SetorId) && c.Estado != Fechado && (estado == null || c.Estado == estado))
            .OrderBy(c => c.CriadoEm).ThenBy(c => c.Id)
            .Select(c => new LinhaDaFila(c.Numero, c.Titulo, db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).Single(), c.Estado,
                db.Usuarios.Where(x => x.Id == c.ResponsavelId).Select(x => x.Nome).SingleOrDefault(), c.CriadoEm)).ToListAsync();
        return [.. fila.Select(c => new ListarChamados.RespostaDaFila(c.Numero, c.Titulo, c.Categoria, c.Estado, c.Responsavel, c.CriadoEm, (int)(agora - c.CriadoEm).TotalDays))];
    }
}
