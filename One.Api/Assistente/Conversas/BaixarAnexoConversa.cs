using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Chamados.Consulta;
using One.Api.Chamados.Permissao;
using One.Api.Dados;

namespace One.Api.Assistente.Conversas;

public sealed record BaixarAnexoConversa(long Id, Usuario Usuario) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/conversas/anexos/{id:long}", (long id, HttpContext ctx, IMediator m) => m.Send(new BaixarAnexoConversa(id, ctx.Usuario())));
}

public sealed class BaixarAnexoConversaHandler(OneDb db, Armazenamento armazenamento) : IRequestHandler<BaixarAnexoConversa, IResult>
{
    record Achado(string Nome, string Tipo, string Chave, long Tamanho, long ConversaId);

    public async ValueTask<IResult> Handle(BaixarAnexoConversa m, CancellationToken ct)
    {
        var anexo = await db.AnexosConversa.Where(x => x.Id == m.Id)
            .Select(x => new Achado(x.Nome, x.Tipo, x.Chave, x.Tamanho, db.MensagensConversa.Where(y => y.Id == x.MensagemConversaId).Select(y => y.ConversaId).Single()))
            .FirstOrDefaultAsync();
        if (anexo is null || !await PodeVer(anexo.ConversaId, m.Usuario)) return Problemas.Erro(404, "Anexo não encontrado.");
        return new ResultadoComTamanho(Results.Stream(await armazenamento.Baixar(anexo.Chave), anexo.Tipo, anexo.Nome), anexo.Tamanho);
    }

    async Task<bool> PodeVer(long conversaId, Usuario u)
    {
        if (await db.Conversas.AnyAsync(c => c.Id == conversaId && c.AlunoId == u.Id)) return true;
        var numero = await db.Chamados.Where(c => c.ConversaId == conversaId).Select(c => c.Numero).FirstOrDefaultAsync();
        if (numero is null) return false;
        var (chamado, papel) = await ChamadoDoUsuario.Carregar(db, u, numero);
        return chamado is not null && papel != PermissoesChamado.Lider;
    }
}
