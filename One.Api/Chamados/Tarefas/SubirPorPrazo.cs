using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using One.Api.Chamados.Consulta;
using One.Api.Chamados.Permissao;
using One.Api.Dados;
using One.Api.Dados.Fluxos;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Chamados.Tarefas;

public sealed class SubirPorPrazo(ILogger<Agendador> log) : ITarefaAgendada
{
    static readonly Expression<Func<Chamado, bool>> EmFluxoEAberto = c => (c.Estado == Aberto || c.Estado == EmAtendimento) && c.EtapaOrdem != null;

    public string Tipo => "subir";

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora) =>
        VenceuOPrazo(db, db.Chamados.IgnoreQueryFilters(), agora).Select(c => new ItemAgendado("subir", c.Id, c.InstituicaoId)).ToListAsync();

    public async Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar)
    {
        var id = itens[0].Id;
        var chamado = await VenceuOPrazo(db, db.Chamados, agora).SingleOrDefaultAsync(c => c.Id == id);
        if (chamado is null || await ConsultasDeFluxo.Seguinte(db, chamado) is not { } passo) return;
        var horas = await db.EtapasFluxo.Where(e => e.VersaoFluxoId == chamado.VersaoFluxoId && e.Ordem == chamado.EtapaOrdem).Select(e => e.PrazoHoras).SingleAsync();
        var nomes = await db.Setores.Where(s => s.Id == chamado.SetorId || s.Id == passo.SetorId).ToDictionaryAsync(s => s.Id, s => s.Nome);
        chamado.Subir(null, new(passo.SetorId, nomes[chamado.SetorId], nomes[passo.SetorId], await AcoesChamado.NomeDoResponsavel(db, chamado)), passo.Etapa.Ordem, $"Sem resposta em {horas} horas", agora);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { return; }
        log.LogInformation("Chamado {ChamadoId} subiu para a etapa {Etapa} por prazo (instituição {InstituicaoId})", id, passo.Etapa.Ordem, db.InstituicaoAtual);
    }

    static IQueryable<Chamado> VenceuOPrazo(OneDb db, IQueryable<Chamado> chamados, DateTime agora) =>
        chamados.Where(EmFluxoEAberto).Where(PrazoDaEtapaVencido(db, agora)).Where(SemRespostaDaEquipe(db));

    static Expression<Func<Chamado, bool>> PrazoDaEtapaVencido(OneDb db, DateTime agora) => c =>
        db.EtapasFluxo.IgnoreQueryFilters().Any(e => e.VersaoFluxoId == c.VersaoFluxoId && e.Ordem == c.EtapaOrdem && e.PrazoHoras != null
            && c.EtapaDesde!.Value.AddHours(e.PrazoHoras.Value) <= agora);

    static Expression<Func<Chamado, bool>> SemRespostaDaEquipe(OneDb db) => c =>
        !db.MensagensChamado.IgnoreQueryFilters().Any(m => m.ChamadoId == c.Id && m.Tipo == TiposMensagem.Publica && m.AutorId != null && m.AutorId != c.SolicitanteId && m.CriadaEm >= c.EtapaDesde);
}
