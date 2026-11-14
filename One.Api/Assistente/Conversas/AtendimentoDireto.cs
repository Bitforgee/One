using Mediator;
using One.Api.Chamados.Acoes;
using One.Api.Dados;
using static One.Api.Assistente.Conversas.ConversaDoAluno;

namespace One.Api.Assistente.Conversas;

public sealed record AtendimentoDireto(AtendimentoDireto.Entrada Corpo, Usuario Usuario, Instituicao Instituicao) : IRequest<IResult>
{
    public sealed record Entrada(string? Descricao, long? MatriculaId);

    public sealed record Resposta(string Numero, string Estado, string Setor);

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/atendimento-direto", (AtendimentoDireto.Entrada i, HttpContext ctx, IMediator m) => m.Send(new AtendimentoDireto(i, ctx.Usuario(), ctx.Instituicao()))).RequireRateLimiting("mensagens");
}

public sealed class AtendimentoDiretoHandler(OneDb db, TimeProvider relogio) : IRequestHandler<AtendimentoDireto, IResult>
{
    public async ValueTask<IResult> Handle(AtendimentoDireto m, CancellationToken ct)
    {
        var (i, u) = (m.Corpo, m.Usuario);
        if (!await PodeUsarAssistente(db, u)) return Problemas.Erro(403, "O atendimento é só para alunos com matrícula ativa.");
        if (string.IsNullOrWhiteSpace(i.Descricao) || i.Descricao.Length > 2000)
            return Problemas.Invalido("A descrição deve ter de 1 a 2000 caracteres.", "descricao");
        var matricula = await Transferencia.Matricula(db, u.Id, i.MatriculaId);
        if (matricula is null) return Transferencia.MatriculaInvalida();

        var agora = relogio.GetUtcNow().UtcDateTime;
        var conversa = Conversa.Iniciar(u.Id, agora);
        conversa.ReceberDoAluno(i.Descricao, [], agora);
        db.Conversas.Add(conversa);
        return await Transferido(db, await new AbrirChamado(conversa, matricula, ComLideranca: false).Executar(db, m.Instituicao, agora),
            (numero, estado, setor) => new AtendimentoDireto.Resposta(numero, estado, setor));
    }
}
