using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Dados.Fluxos;
using static One.Api.Chamados.AcoesChamado;

namespace One.Api.Chamados;

public sealed record SubirChamado(string Numero, SubirChamado.Entrada Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public sealed record Entrada(string? Motivo);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/subir", (string numero, SubirChamado.Entrada i, HttpContext ctx, IMediator m) => m.Send(new SubirChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "subir";

    public ValueTask<IResult?> Validar(AcessoChamado a, OneDb db) =>
        ValueTask.FromResult(Texto(Corpo.Motivo, "motivo", "Explique o motivo, com até 4000 caracteres."));
}

public sealed class SubirChamadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<SubirChamado, IResult>
{
    public const string SemEtapa = "O chamado não tem uma etapa seguinte que resolva.";

    public async ValueTask<IResult> Handle(SubirChamado m, CancellationToken ct)
    {
        if (await ConsultasDeFluxo.Seguinte(db, a.Chamado) is not { } passo) return Problemas.Erro(409, SemEtapa);
        var nomes = await db.Setores.Where(s => s.Id == a.Chamado.SetorId || s.Id == passo.SetorId).ToDictionaryAsync(s => s.Id, s => s.Nome);
        a.Chamado.Subir(a.Usuario.Id, nomes[a.Chamado.SetorId], nomes[passo.SetorId], passo.SetorId, passo.Etapa.Ordem, m.Corpo.Motivo!, await NomeDoResponsavel(db, a.Chamado), a.Agora);
        return Results.Empty;
    }
}
