using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

// Consulta do chamado: listas, detalhe, anexo e respostas prontas. As ações ficam em AcoesChamado.
public static class ChamadoRotas
{
    public static IResult NaoEncontrado() => Problemas.Erro(404, "Chamado não encontrado.");

    // Visível ao aluno solicitante e aos atendentes do setor atual; para os demais o chamado "não existe" (AC 72).
    public static async Task<(Chamado?, string?)> Carregar(OneDb db, Usuario u, string numero)
    {
        var c = await db.Chamados.FirstOrDefaultAsync(x => x.Numero == numero);
        if (c is null) return (null, null);
        if (c.SolicitanteId == u.Id) return (c, PermissoesChamado.Aluno);
        if (u.Tem(Papeis.Atendente) && await db.AtendenteSetores.AnyAsync(a => a.UsuarioId == u.Id && a.SetorId == c.SetorId)) return (c, PermissoesChamado.Atendente);
        return (null, null);
    }

    public static void Mapear(RouteGroupBuilder api)
    {
        ListarChamados.Mapear(api);
        VerChamado.Mapear(api);
        AcoesChamado.Mapear(api);
        RespostasProntasDoSetor.Mapear(api);
        BaixarAnexo.Mapear(api);
    }
}
