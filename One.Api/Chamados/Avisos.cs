using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Chamados;

public static class Avisos
{
    public static string Link(IConfiguration cfg, Instituicao i, Chamado c) =>
        $"{Tokens.UrlBase(cfg)}/{i.Slug}/chamados/{c.Numero}";

    static async Task Enfileirar(OneDb db, IConfiguration cfg, Chamado c, DateTime agora, string assunto, string corpo)
    {
        var para = await db.Usuarios.Where(u => u.Id == c.SolicitanteId).Select(u => u.Email).SingleAsync();
        db.EmailsSaida.Add(new EmailSaida { Destinatario = para, Assunto = assunto, Corpo = corpo, ProximaTentativa = agora });
        if (!ConfigPush.Ler(cfg).Ligado) return;
        var aparelhos = await db.SubscricoesPush.Where(s => s.UsuarioId == c.SolicitanteId).Select(s => s.Id).ToListAsync();
        db.PushesSaida.AddRange(aparelhos.Select(id => PushSaida.Criar(id, c.Id, agora)));
    }

    public static Task NovaResposta(OneDb db, IConfiguration cfg, Instituicao i, Chamado c, DateTime agora) =>
        Enfileirar(db, cfg, c, agora, $"[{i.Nome}] {c.Numero}: nova resposta",
            $"Sua solicitação {c.Numero} recebeu uma nova resposta.\n\nPara ler e responder, abra:\n{Link(cfg, i, c)}\n");

    public static Task Resolvido(OneDb db, IConfiguration cfg, Prazos prazos, Instituicao i, Chamado c, string texto, DateTime agora) =>
        Enfileirar(db, cfg, c, agora, $"[{i.Nome}] {c.Numero} foi resolvida",
            $"Sua solicitação {c.Numero} foi resolvida:\n\n{texto}\n\nPara confirmar ou rejeitar a resolução (até {prazos.RejeicaoDias} dias), abra:\n{Link(cfg, i, c)}\n");

    public static string DataLocal(Instituicao i, DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(utc, TimeZoneInfo.FindSystemTimeZoneById(i.Fuso)).ToString("dd/MM/yyyy HH:mm");

    public static Task AguardaResposta(OneDb db, IConfiguration cfg, Instituicao i, Chamado c, DateTime agora) =>
        Enfileirar(db, cfg, c, agora, $"[{i.Nome}] {c.Numero} aguarda sua resposta",
            $"O atendimento da solicitação {c.Numero} está esperando uma resposta sua desde {DataLocal(i, c.AguardandoDesde ?? agora)} (horário da instituição).\n\nPara responder, abra:\n{Link(cfg, i, c)}\n");
}
