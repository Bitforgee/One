using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;
using One.Api.Dados.Conversas;

namespace One.Api.Indicadores;

public sealed record ConsultarIndicadores(DateOnly? De, DateOnly? Ate, long? SetorId, Usuario Usuario, Instituicao Instituicao) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/indicadores", (DateOnly? de, DateOnly? ate, long? setorId, HttpContext ctx, IMediator m) =>
            m.Send(new ConsultarIndicadores(de, ate, setorId, ctx.Usuario(), ctx.Instituicao())));
}

public sealed class ConsultarIndicadoresHandler(OneDb db) : IRequestHandler<ConsultarIndicadores, IResult>
{
    public async ValueTask<IResult> Handle(ConsultarIndicadores m, CancellationToken ct)
    {
        var (u, de, ate, setorId) = (m.Usuario, m.De, m.Ate, m.SetorId);
        if (!u.Tem(Papeis.Administrador) && !u.Tem(Papeis.Atendente)) return Problemas.Erro(403, "Os indicadores são para administradores e atendentes.");
        if (await db.SoLideranca(u)) return Problemas.Erro(403, "Os indicadores não estão disponíveis para a liderança de turma.");
        if (de is null || ate is null) return Problemas.Invalido("Informe o período (de e ate).", "de");
        if (de > ate) return Problemas.Invalido("A data inicial deve ser anterior ou igual à final.", "de");
        var (setores, recusa) = await Escopo(u, setorId);
        if (recusa is not null) return recusa;

        var fuso = TimeZoneInfo.FindSystemTimeZoneById(m.Instituicao.Fuso);
        var massa = await Ler(setores, CalculoIndicadores.Periodo(de.Value, ate.Value, fuso));
        return Results.Ok(CalculoIndicadores.Calcular(massa, de.Value, ate.Value, fuso, setorId));
    }

    async Task<(List<long>?, IResult?)> Escopo(Usuario u, long? setorId)
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

    async Task<Massa> Ler(List<long>? setores, (DateTime Inicio, DateTime Fim) periodo)
    {
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
        var (conversas, citadas) = await Conversas(periodo.Inicio, periodo.Fim);
        return new Massa(todos, eventos, respostas, conversas, citadas, categorias);
    }

    async Task<(List<ConversaLida>, List<long>)> Conversas(DateTime inicio, DateTime fim)
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
