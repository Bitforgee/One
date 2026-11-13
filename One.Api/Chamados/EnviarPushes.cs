using System.Net;
using Lib.Net.Http.WebPush;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

public sealed class EnviarPushes(IEnviadorPush envio, TimeProvider relogio, ILogger<EnviarPushes> log) : ITarefaAgendada
{
    static readonly TimeSpan LimiteDoPush = TimeSpan.FromSeconds(30);

    record DoChamado(string Numero, string Estado);
    record DaInstituicao(string Slug, string Titulo);

    public string Tipo => "push";

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora) =>
        db.PushesSaida.IgnoreQueryFilters().Where(p => p.EnviadoEm == null && p.Tentativas < Agendador.MaxTentativas && p.ProximaTentativa <= agora
                && db.SubscricoesPush.IgnoreQueryFilters().Any(s => s.Id == p.SubscricaoId && s.InstituicaoId == p.InstituicaoId))
            .Select(p => new ItemAgendado("push", p.Id, p.InstituicaoId)).ToListAsync();

    public async Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar)
    {
        var id = itens[0].Id;
        var p = await db.PushesSaida.SingleOrDefaultAsync(x => x.Id == id && x.EnviadoEm == null && x.Tentativas < Agendador.MaxTentativas);
        var s = p is null ? null : await db.SubscricoesPush.SingleOrDefaultAsync(x => x.Id == p.SubscricaoId);
        if (p is null || s is null) return;
        var chamado = await db.Chamados.Where(c => c.Id == p.ChamadoId).Select(c => new DoChamado(c.Numero, c.Estado)).SingleAsync();
        var inst = await db.Instituicoes.Where(i => i.Id == p.InstituicaoId).Select(i => new DaInstituicao(i.Slug, i.NomeCurto ?? i.Nome)).SingleAsync();
        var icone = await db.ImagensInstituicao.Where(x => x.Tipo == TiposDeImagem.Icone && x.RemovidaEm == null).Select(x => (int?)x.Versao).FirstOrDefaultAsync();
        using var prazo = new CancellationTokenSource(LimiteDoPush, relogio);
        using var junto = CancellationTokenSource.CreateLinkedTokenSource(parar, prazo.Token);
        try
        {
            await envio.Enviar(s.Endpoint, s.P256dh, s.Auth, PayloadPush.De(inst.Slug, chamado.Numero, inst.Titulo, chamado.Estado, icone), junto.Token);
            p.Concluir(agora);
        }
        catch (PushServiceClientException e) when (e.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            db.SubscricoesPush.Remove(s);
        }
        catch (Exception falha) when (!parar.IsCancellationRequested)
        {
            p.RegistrarFalha(agora);
            if (p.Tentativas >= Agendador.MaxTentativas) log.LogError(falha, "Desistência do push {PushId} da instituição {InstituicaoId} após {Tentativas} tentativas", id, p.InstituicaoId, p.Tentativas);
            else log.LogWarning(falha, "Falha ao enviar o push {PushId} da instituição {InstituicaoId}, tentativa {Tentativas}", id, p.InstituicaoId, p.Tentativas);
        }
        await db.SaveChangesAsync();
    }
}
