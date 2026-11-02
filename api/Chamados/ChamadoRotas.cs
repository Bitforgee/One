using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

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
        api.MapGet("/chamados", Listar);
        api.MapGet("/chamados/{numero}", Ver);
        AcoesChamado.Mapear(api);
        api.MapGet("/respostas-prontas", RespostasProntas);
        api.MapGet("/anexos/{id:long}", Anexo);
    }

    static async Task<IResult> Listar(string? escopo, string? estado, HttpContext ctx, OneDb db, TimeProvider relogio)
    {
        var u = ctx.Usuario();
        if (escopo != "fila") return Results.Ok(await Meus(db, u, estado));
        if (!u.Tem(Papeis.Atendente)) return Results.Ok(Array.Empty<object>());
        return Results.Ok(await Fila(db, u, estado, relogio.GetUtcNow().UtcDateTime));
    }

    static async Task<object> Meus(OneDb db, Usuario u, string? estado) =>
        await db.Chamados.Where(c => c.SolicitanteId == u.Id && (estado == null || c.Estado == estado))
            .OrderByDescending(c => c.CriadoEm).ThenByDescending(c => c.Id)
            .Select(c => new { numero = c.Numero, titulo = c.Titulo, estado = c.Estado, criadoEm = c.CriadoEm })
            .ToListAsync();

    // Fila dos setores do atendente, do mais antigo para o mais novo.
    static async Task<object> Fila(OneDb db, Usuario u, string? estado, DateTime agora)
    {
        var setores = db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId);
        var fila = await db.Chamados
            .Where(c => setores.Contains(c.SetorId) && c.Estado != Fechado && (estado == null || c.Estado == estado))
            .OrderBy(c => c.CriadoEm).ThenBy(c => c.Id)
            .Select(c => new
            {
                c.Numero,
                c.Titulo,
                Categoria = db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).Single(),
                c.Estado,
                Responsavel = db.Usuarios.Where(x => x.Id == c.ResponsavelId).Select(x => x.Nome).SingleOrDefault(),
                c.CriadoEm,
            }).ToListAsync();
        return fila.Select(c => new { numero = c.Numero, titulo = c.Titulo, categoria = c.Categoria, estado = c.Estado, responsavel = c.Responsavel, criadoEm = c.CriadoEm, dias = (int)(agora - c.CriadoEm).TotalDays });
    }

    static async Task<IResult> Ver(string numero, HttpContext ctx, OneDb db)
    {
        var (chamado, papel) = await Carregar(db, ctx.Usuario(), numero);
        return chamado is null ? NaoEncontrado() : Results.Ok(await DetalheChamado.Montar(db, ctx, chamado, papel!));
    }

    // AC 147: respostas prontas do setor, só para quem atende nele
    static async Task<IResult> RespostasProntas(long? setorId, HttpContext ctx, OneDb db)
    {
        var u = ctx.Usuario();
        if (!u.Tem(Papeis.Atendente) || !await db.AtendenteSetores.AnyAsync(a => a.UsuarioId == u.Id && a.SetorId == setorId))
            return Problemas.Erro(404, "Setor não encontrado.");
        return Results.Ok(await db.RespostasProntas.Where(r => r.SetorId == setorId).OrderBy(r => r.Titulo)
            .Select(r => new { id = r.Id, titulo = r.Titulo, texto = r.Texto }).ToListAsync());
    }

    // AC 129: o anexo segue o acesso ao chamado
    static async Task<IResult> Anexo(long id, HttpContext ctx, OneDb db)
    {
        var anexo = await db.Anexos.Where(x => x.Id == id)
            .Select(x => new { x.Nome, x.Tipo, x.Conteudo, Numero = db.Chamados.Where(c => db.MensagensChamado.Any(m => m.Id == x.MensagemChamadoId && m.ChamadoId == c.Id)).Select(c => c.Numero).Single() })
            .FirstOrDefaultAsync();
        if (anexo is null || (await Carregar(db, ctx.Usuario(), anexo.Numero)).Item1 is null) return Problemas.Erro(404, "Anexo não encontrado.");
        return Results.File(anexo.Conteudo, anexo.Tipo, anexo.Nome);
    }
}
