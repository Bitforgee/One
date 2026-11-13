using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

public sealed class EnviarEmails(EnviadorSmtp email, ILogger<Agendador> log) : ITarefaAgendada
{
    public string Tipo => "email";

    public Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora) =>
        db.EmailsSaida.IgnoreQueryFilters().Where(e => e.EnviadoEm == null && e.Tentativas < Agendador.MaxTentativas && e.ProximaTentativa <= agora)
            .Select(e => new ItemAgendado("email", e.Id, e.InstituicaoId)).ToListAsync();

    public async Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar)
    {
        var id = itens[0].Id;
        var e = await db.EmailsSaida.SingleAsync(x => x.Id == id);
        var instituicao = await db.Instituicoes.SingleAsync(i => i.Id == e.InstituicaoId);
        try
        {
            await email.Enviar(db, instituicao, e.Destinatario, e.Assunto, e.Corpo);
            e.Concluir(agora);
        }
        catch (Exception falha)
        {
            e.RegistrarFalha(agora);
            if (e.Tentativas >= Agendador.MaxTentativas) log.LogError(falha, "Desistência do e-mail {EmailId} da instituição {InstituicaoId} após {Tentativas} tentativas", id, e.InstituicaoId, e.Tentativas);
            else log.LogWarning(falha, "Falha ao enviar o e-mail {EmailId} da instituição {InstituicaoId}, tentativa {Tentativas}", id, e.InstituicaoId, e.Tentativas);
        }
        await db.SaveChangesAsync();
    }
}
