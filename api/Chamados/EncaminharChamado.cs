using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public sealed record EncaminharChamado(string Numero, EncaminharIn Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/encaminhar", (string numero, EncaminharIn i, HttpContext ctx, IMediator m) => m.Send(new EncaminharChamado(numero, i, ctx.Usuario(), ctx.Instituicao())));

    public string Acao => "encaminhar";

    public async ValueTask<IResult?> Validar(AcessoChamado a, OneDb db)
    {
        if (string.IsNullOrWhiteSpace(Corpo.Motivo) || Corpo.Motivo.Length > 4000) return Problemas.Invalido("Explique o motivo do encaminhamento.", "motivo");
        if (Corpo.SetorId == a.Chamado.SetorId || !await db.Setores.AnyAsync(s => s.Id == Corpo.SetorId && s.Ativo))
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
        Mensagem(db, a, TiposMensagem.Nota, i.Motivo!);
        Evento(db, a, TiposEvento.Encaminhamento, nomes[a.Chamado.SetorId], nomes[i.SetorId!.Value]);
        await Atribuir(db, a, null);
        Mudar(db, a, Aberto);
        a.Chamado.SetorId = i.SetorId.Value;
        a.Chamado.Encaminhamentos++;
        return Results.Empty;
    }
}
