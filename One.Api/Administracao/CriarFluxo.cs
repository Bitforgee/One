using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarFluxo(CriarFluxo.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(long? CategoriaId, long? CursoId, int? Semestre);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/fluxos", (CriarFluxo.Entrada i, IMediator m) => m.Send(new CriarFluxo(i)));
}

public sealed class CriarFluxoHandler(OneDb db) : IRequestHandler<CriarFluxo, IResult>
{
    public async ValueTask<IResult> Handle(CriarFluxo m, CancellationToken ct)
    {
        var i = m.Corpo;
        if (await Validar(i) is { } erro) return erro;
        if (await db.Fluxos.AnyAsync(f => f.CategoriaId == i.CategoriaId && f.CursoId == i.CursoId && f.Semestre == i.Semestre)) return Repetido();
        var fluxo = Fluxo.Criar(i.CategoriaId!.Value, i.CursoId, i.Semestre);
        db.Fluxos.Add(fluxo);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/fluxos/{fluxo.Id}", FluxoResposta.De(fluxo));
    }

    static IResult Repetido() => ErrosDeAdmin.Repetido("Já existe um fluxo para esta categoria e esta abrangência.");

    async Task<IResult?> Validar(CriarFluxo.Entrada i)
    {
        if (!await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId && !c.Padrao)) return Problemas.Invalido("Escolha uma categoria que não seja \"Não classificado\".", "categoriaId");
        if (i.Semestre is not null && i.CursoId is null) return Problemas.Invalido("O semestre só vale junto com o curso.", "semestre");
        if (i.Semestre is < 1 or > 12) return Problemas.Invalido("O semestre deve ficar entre 1 e 12.", "semestre");
        if (i.CursoId is not null && !await db.Cursos.AnyAsync(c => c.Id == i.CursoId)) return Problemas.Invalido("Escolha um curso da instituição.", "cursoId");
        return null;
    }
}
