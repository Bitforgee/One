using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

public class TempoRealHub(OneDb db) : Hub
{
    public async Task EntrarNoChamado(string numero)
    {
        var u = await Reler();
        var (c, _) = string.IsNullOrWhiteSpace(numero) ? (null, null) : await ChamadoRotas.Carregar(db, u, numero);
        if (c is null) throw new HubException("Chamado não encontrado.");
        await Groups.AddToGroupAsync(Context.ConnectionId, TempoRealGrupos.Chamado(u.InstituicaoId, c.Numero));
    }

    public async Task SairDoChamado(string numero)
    {
        var u = await Reler();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, TempoRealGrupos.Chamado(u.InstituicaoId, numero ?? ""));
    }

    public async Task EntrarNaFila()
    {
        var u = await Reler();
        if (!u.Tem(Papeis.Atendente)) throw new HubException("A fila é só para atendentes.");
        var setores = await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId).ToListAsync();
        foreach (var setorId in setores)
            await Groups.AddToGroupAsync(Context.ConnectionId, TempoRealGrupos.Fila(u.InstituicaoId, setorId));
    }

    async Task<Usuario> Reler()
    {
        var sub = long.Parse(Context.User!.FindFirstValue("sub")!);
        var instituicaoId = long.Parse(Context.User!.FindFirstValue("instituicao_id")!);
        db.InstituicaoAtual = instituicaoId;
        var instituicao = await db.Instituicoes.FindAsync(instituicaoId);
        var usuario = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Id == sub);
        if (instituicao is not { Ativa: true } || usuario is not { Ativo: true }) throw new HubException("Sessão inválida.");
        return usuario;
    }
}
