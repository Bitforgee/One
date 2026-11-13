using Mediator;
using Microsoft.AspNetCore.Http.HttpResults;
using One.Api.Dados;

namespace One.Api.Chamados;

public interface IAcaoChamado : IRequest<IResult>
{
    string Numero { get; }
    string Acao { get; }
    Usuario Usuario { get; }
    Instituicao Instituicao { get; }
    bool Criado => false;
    ValueTask<IResult?> Validar(AcessoChamado a, OneDb db);
}

public sealed class AgirNoChamado<TMessage, TResponse>(OneDb db, AcessoChamado acesso, TimeProvider relogio)
    : IPipelineBehavior<TMessage, TResponse> where TMessage : IAcaoChamado where TResponse : IResult
{
    public async ValueTask<TResponse> Handle(TMessage m, MessageHandlerDelegate<TMessage, TResponse> next, CancellationToken ct) =>
        (TResponse)await Agir(m, async () => await next(m, ct));

    async Task<IResult> Agir(TMessage m, Func<Task<IResult>> aplicar)
    {
        var (chamado, papel) = await ChamadoDoUsuario.Carregar(db, m.Usuario, m.Numero);
        if (chamado is null) return ChamadoDoUsuario.NaoEncontrado();
        acesso.Preencher(chamado, papel!, relogio.GetUtcNow().UtcDateTime);
        if (PermissoesChamado.Estados(m.Acao, papel!) is not { } estados) return Problemas.Erro(403, "Seu papel neste chamado não permite esta ação.");
        if (await m.Validar(acesso, db) is { } invalido) return invalido;
        if (!estados.Contains(chamado.Estado)) return Problemas.Erro(409, "A ação não é permitida no estado atual do chamado.");
        var aplicada = await aplicar();
        if (aplicada is not EmptyHttpResult) return aplicada;
        await db.SaveChangesAsync();
        var corpo = await DetalheChamado.Montar(db, m.Usuario.Id, chamado, papel!);
        return m.Criado ? Results.Created($"/api/chamados/{m.Numero}", corpo) : Results.Ok(corpo);
    }
}
