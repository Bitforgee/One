using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Indicadores;

// S11: a rota confere quem pede e o período, lê do banco e entrega a conta a CalculoIndicadores.
public static class IndicadorRotas
{
    public static void Mapear(RouteGroupBuilder api) => api.MapGet("/indicadores", Indicadores);

    static async Task<IResult> Indicadores(DateOnly? de, DateOnly? ate, long? setorId, HttpContext ctx, OneDb db)
    {
        var u = ctx.Usuario();
        if (!u.Tem(Papeis.Administrador) && !u.Tem(Papeis.Atendente)) return Problemas.Erro(403, "Os indicadores são para administradores e atendentes.");
        if (de is null || ate is null) return Problemas.Invalido("Informe o período (de e ate).", "de");
        if (de > ate) return Problemas.Invalido("A data inicial deve ser anterior ou igual à final.", "de");
        var (setores, recusa) = await Escopo(db, u, setorId);
        if (recusa is not null) return recusa;

        var fuso = TimeZoneInfo.FindSystemTimeZoneById(ctx.Instituicao().Fuso);
        var massa = await Ler(db, setores, CalculoIndicadores.Periodo(de.Value, ate.Value, fuso));
        return Results.Ok(CalculoIndicadores.Calcular(massa, de.Value, ate.Value, fuso, setorId));
    }

    // AC 134: o atendente vê só os setores dele; o administrador, a instituição ou o setor pedido. Null = a instituição toda.
    static async Task<(List<long>?, IResult?)> Escopo(OneDb db, Usuario u, long? setorId)
    {
        if (!u.Tem(Papeis.Administrador))
        {
            var meus = await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId).ToListAsync();
            if (setorId is not null && !meus.Contains(setorId.Value)) return (null, Problemas.Erro(403, "Este setor não é seu."));
            return (setorId is null ? meus : [setorId.Value], null);
        }
        if (setorId is null) return (null, null);
        return await db.Setores.AnyAsync(s => s.Id == setorId) ? ([setorId.Value], null) : (null, Problemas.Invalido("Setor inexistente.", "setorId"));
    }

    // shortcut: calcula em memória sobre os chamados do escopo; com milhares de chamados por instituição, agregar em SQL
    static async Task<Massa> Ler(OneDb db, List<long>? setores, (DateTime Inicio, DateTime Fim) periodo)
    {
        // AC 148: chamado duplicado não conta
        var todos = await db.Chamados.Where(c => c.MotivoFechamento != MotivosFechamento.Duplicado || c.MotivoFechamento == null)
            .Select(c => new ChamadoLido(c.Id, c.CriadoEm, c.Estado, c.MotivoFechamento, c.Reaberturas, c.Encaminhamentos, c.CategoriaOriginalId, c.SetorId, c.SolicitanteId)).ToListAsync();
        var eventos = await db.EventosChamado.Where(e => e.Tipo == TiposEvento.Transicao || e.Tipo == TiposEvento.Encaminhamento)
            .OrderBy(e => e.CriadoEm).ThenBy(e => e.Id).ToListAsync();
        if (setores is not null)
            todos = CalculoIndicadores.DosSetores(todos, eventos, setores, await db.Setores.Where(s => setores.Contains(s.Id)).Select(s => s.Nome).ToListAsync());
        var ids = todos.Select(c => c.Id).ToList();
        var respostas = await db.MensagensChamado.Where(m => ids.Contains(m.ChamadoId) && m.Tipo == TiposMensagem.Publica)
            .Select(m => new RespostaLida(m.ChamadoId, m.AutorId, m.CriadaEm)).ToListAsync();
        var categorias = await db.Categorias.ToDictionaryAsync(c => c.Id, c => c.Nome);
        if (setores is not null) return new Massa(todos, eventos, respostas, null, null, categorias);
        var (conversas, citadas) = await Conversas(db, periodo.Inicio, periodo.Fim);
        return new Massa(todos, eventos, respostas, conversas, citadas, categorias);
    }

    // Conversas do período e a categoria de cada fonte citada nelas (uma vez por conversa e categoria).
    static async Task<(List<ConversaLida>, List<long>)> Conversas(OneDb db, DateTime inicio, DateTime fim)
    {
        var conversas = (await db.Conversas.Where(c => c.CriadaEm >= inicio && c.CriadaEm < fim)
                .Select(c => new { c.AlunoId, c.Desfecho, SemBase = db.MensagensConversa.Any(m => m.ConversaId == c.Id && m.TipoFinal == Tipos.SemBase) })
                .ToListAsync())
            .Select(c => new ConversaLida(c.AlunoId, c.Desfecho, c.SemBase)).ToList();
        var citadas = await (
            from ci in db.CategoriasCitadas()
            join m in db.MensagensConversa on ci.MensagemConversaId equals m.Id
            join c in db.Conversas on m.ConversaId equals c.Id
            where c.CriadaEm >= inicio && c.CriadaEm < fim
            select new { c.Id, ci.CategoriaId }).Distinct().ToListAsync();
        return (conversas, citadas.Select(x => x.CategoriaId).ToList());
    }
}
