using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public sealed record EncaminharChamado(string Numero, EncaminharChamado.Entrada Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public sealed record Entrada(long? SetorId, string? Motivo);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/encaminhar", (string numero, EncaminharChamado.Entrada i, HttpContext ctx, IMediator m) => m.Send(new EncaminharChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "encaminhar";

    public async ValueTask<IResult?> Validar(AcessoChamado a, OneDb db)
    {
        if (string.IsNullOrWhiteSpace(Corpo.Motivo) || Corpo.Motivo.Length > 4000) return Problemas.Invalido("Explique o motivo do encaminhamento.", "motivo");
        if (Corpo.SetorId == a.Chamado.SetorId || !await db.Setores.AnyAsync(s => s.Id == Corpo.SetorId && s.Ativo && s.CursoId == null))
            return Problemas.Invalido("Escolha outro setor ativo.", "setorId");
        return null;
    }
}

public sealed class EncaminharChamadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<EncaminharChamado, IResult>
{
    public async ValueTask<IResult> Handle(EncaminharChamado m, CancellationToken ct)
    {
        var i = m.Corpo;
        var nomes = await db.Setores.Where(s => s.Id == a.Chamado.SetorId || s.Id == i.SetorId).ToDictionaryAsync(s => s.Id, s => s.Nome);
        a.Chamado.Encaminhar(a.Usuario.Id, i.SetorId!.Value, nomes[a.Chamado.SetorId], nomes[i.SetorId.Value], i.Motivo!, await NomeDoResponsavel(db, a.Chamado), a.Agora);
        return Results.Empty;
    }
}
