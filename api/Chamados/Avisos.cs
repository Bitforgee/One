using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

// door 11: e-mails de chamado entram em email_saida na transação da ação; o agendador envia.
public static class Avisos
{
    public static string Link(IConfiguration cfg, Instituicao i, Chamado c) =>
        $"{(cfg["App:UrlBase"] ?? "http://localhost:8080").TrimEnd('/')}/{i.Slug}/chamados/{c.Numero}";

    static async Task Enfileirar(OneDb db, Chamado c, DateTime agora, string assunto, string corpo)
    {
        var para = await db.Usuarios.Where(u => u.Id == c.SolicitanteId).Select(u => u.Email).SingleAsync();
        db.EmailsSaida.Add(new EmailSaida { Destinatario = para, Assunto = assunto, Corpo = corpo, ProximaTentativa = agora });
    }

    // AC 122
    public static Task NovaResposta(OneDb db, IConfiguration cfg, Instituicao i, Chamado c, DateTime agora) =>
        Enfileirar(db, c, agora, $"[{i.Nome}] {c.Numero}: nova resposta",
            $"Sua solicitação {c.Numero} recebeu uma nova resposta.\n\nPara ler e responder, abra:\n{Link(cfg, i, c)}\n");

    // AC 123
    public static Task Resolvido(OneDb db, IConfiguration cfg, Instituicao i, Chamado c, string texto, DateTime agora) =>
        Enfileirar(db, c, agora, $"[{i.Nome}] {c.Numero} foi resolvido",
            $"Sua solicitação {c.Numero} foi resolvida:\n\n{texto}\n\nPara confirmar ou rejeitar a resolução (até 7 dias), abra:\n{Link(cfg, i, c)}\n");

    // AC 10: datas no fuso da instituição do item, no formato dd/mm/aaaa hh:mm
    public static string DataLocal(Instituicao i, DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(utc, TimeZoneInfo.FindSystemTimeZoneById(i.Fuso)).ToString("dd/MM/yyyy HH:mm");

    // AC 145
    public static Task AguardaResposta(OneDb db, IConfiguration cfg, Instituicao i, Chamado c, DateTime agora) =>
        Enfileirar(db, c, agora, $"[{i.Nome}] {c.Numero} aguarda sua resposta",
            $"O atendimento da solicitação {c.Numero} está esperando uma resposta sua desde {DataLocal(i, c.AguardandoDesde ?? agora)} (horário da instituição).\n\nPara responder, abra:\n{Link(cfg, i, c)}\n");
}
