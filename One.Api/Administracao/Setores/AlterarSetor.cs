using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Chamados.Consulta;
using One.Api.Dados;

namespace One.Api.Administracao.Setores;

public sealed record AlterarSetor(long Id, AlterarSetor.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, bool? Triagem, bool? Ativo);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/setores/{id:long}", (long id, AlterarSetor.Entrada i, IMediator m) => m.Send(new AlterarSetor(id, i)));
}

public sealed class AlterarSetorHandler(OneDb db) : IRequestHandler<AlterarSetor, IResult>
{
    public async ValueTask<IResult> Handle(AlterarSetor m, CancellationToken ct)
    {
        var setor = await db.Setores.FirstOrDefaultAsync(s => s.Id == m.Id, ct);
        if (setor is null) return ErrosDeAdmin.NaoEncontrado();
        var e = m.Corpo;
        if (Setor.Validar(e.Nome, e.Triagem, null, null) is { } invalido) return Problemas.Invalido(invalido.Motivo, ValidacaoDeSetor.Campo(invalido));
        var erro = await EmFluxoPublicado(setor, e) ?? await ValidacaoDeSetor.TriagemENome(db, e.Nome, e.Triagem, setor.Id)
            ?? await ValidacaoDeSetor.LiderancaRepetida(db, setor.CursoId, setor.Semestre, e.Ativo, setor.Id);
        if (erro is not null) return erro;
        setor.Alterar(e.Nome, e.Triagem, e.Ativo);
        await db.SaveChangesAsync(ct);
        return Results.Ok(SetorResposta.De(setor));
    }

    async Task<IResult?> EmFluxoPublicado(Setor setor, AlterarSetor.Entrada e)
    {
        if (setor is not { Ativo: true } || e.Ativo != false) return null;
        var categorias = await ConsultasDeFluxo.CategoriasQueUsamOSetor(db, setor.Id);
        return categorias.Count == 0 ? null
            : ErrosDeAdmin.Repetido($"O setor é usado em fluxo publicado (categoria: {string.Join("; ", categorias.Order())}). Publique o fluxo sem ele antes de desativar.");
    }
}
