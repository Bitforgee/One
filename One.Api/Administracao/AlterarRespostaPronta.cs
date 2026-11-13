using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record AlterarRespostaPronta(long Id, AlterarRespostaPronta.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(long? SetorId, string? Titulo, string? Texto);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPut("/respostas-prontas/{id:long}", (long id, AlterarRespostaPronta.Entrada i, IMediator m) => m.Send(new AlterarRespostaPronta(id, i)));
}

public sealed class AlterarRespostaProntaHandler(OneDb db) : IRequestHandler<AlterarRespostaPronta, IResult>
{
    public async ValueTask<IResult> Handle(AlterarRespostaPronta m, CancellationToken ct)
    {
        var e = m.Corpo;
        var resposta = await db.RespostasProntas.FirstOrDefaultAsync(r => r.Id == m.Id, ct);
        if (resposta is null) return AdminRotas.NaoEncontrado();
        if (!await db.Setores.AnyAsync(s => s.Id == e.SetorId, ct)) return Problemas.Invalido("Setor inexistente.", "setorId");
        if (RespostaPronta.Validar(e.Titulo, e.Texto) is { } invalido) return Problemas.Invalido(invalido.Motivo, invalido.Motivo == RespostaPronta.MotivoTitulo ? "titulo" : "texto");
        if (await db.RespostasProntas.AnyAsync(r => r.SetorId == e.SetorId && r.Titulo == e.Titulo && r.Id != resposta.Id, ct)) return AdminRotas.Repetido("Já existe uma resposta pronta com este título no setor.");
        resposta.Alterar(e.SetorId!.Value, e.Titulo!, e.Texto!);
        await db.SaveChangesAsync(ct);
        return Results.Ok(RespostaProntaResposta.De(resposta));
    }
}
