using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarRespostaPronta(CriarRespostaPronta.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(long? SetorId, string? Titulo, string? Texto);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/respostas-prontas", (CriarRespostaPronta.Entrada i, IMediator m) => m.Send(new CriarRespostaPronta(i)));
}

public sealed class CriarRespostaProntaHandler(OneDb db) : IRequestHandler<CriarRespostaPronta, IResult>
{
    public async ValueTask<IResult> Handle(CriarRespostaPronta m, CancellationToken ct)
    {
        var e = m.Corpo;
        if (!await db.Setores.AnyAsync(s => s.Id == e.SetorId, ct)) return Problemas.Invalido("Setor inexistente.", "setorId");
        if (RespostaPronta.Validar(e.Titulo, e.Texto) is { } invalido) return Problemas.Invalido(invalido.Motivo, invalido.Motivo == RespostaPronta.MotivoTitulo ? "titulo" : "texto");
        if (await db.RespostasProntas.AnyAsync(r => r.SetorId == e.SetorId && r.Titulo == e.Titulo, ct)) return AdminRotas.Repetido("Já existe uma resposta pronta com este título no setor.");
        var resposta = RespostaPronta.Criar(e.SetorId!.Value, e.Titulo!, e.Texto!);
        db.RespostasProntas.Add(resposta);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/respostas-prontas/{resposta.Id}", RespostaProntaResposta.De(resposta));
    }
}
