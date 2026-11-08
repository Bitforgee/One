using MailKit.Net.Smtp;
using MailKit.Security;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using One.Api.Dados;

namespace One.Api;

public partial class Email(IConfiguration cfg, Armazenamento armazenamento, ILogger<Email> log)
{
    const string CorPadrao = "#224fa7";
    static readonly TimeSpan PrazoDoLogo = TimeSpan.FromSeconds(3);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")] public static partial Regex Valido();

    // door 6: o texto é o Corpo de sempre; o HTML leva a cor da instituição e o logo inline, montados no envio
    public async Task Enviar(OneDb db, Instituicao instituicao, string para, string assunto, string corpo)
    {
        var logo = await Logo(db, instituicao.Id);
        var msg = new MimeMessage();
        msg.From.Add(new MailboxAddress(instituicao.Nome, cfg["Smtp:Remetente"] ?? "nao-responda@one.local"));
        msg.To.Add(MailboxAddress.Parse(para));
        msg.Subject = assunto;
        var partes = new BodyBuilder { TextBody = corpo, HtmlBody = Html(instituicao.Nome, instituicao.Cor, logo is not null, corpo) };
        if (logo is { } l) partes.LinkedResources.Add("logo", l.Bytes, ContentType.Parse(l.Tipo)).ContentId = "logo";
        msg.Body = partes.ToMessageBody();

        using var smtp = new SmtpClient { Timeout = 10_000 };
        await smtp.ConnectAsync(cfg["Smtp:Host"] ?? "localhost", int.Parse(cfg["Smtp:Porta"] ?? "1025"), SecureSocketOptions.Auto);
        if (!string.IsNullOrEmpty(cfg["Smtp:Usuario"]))
            await smtp.AuthenticateAsync(cfg["Smtp:Usuario"]!, cfg["Smtp:Senha"] ?? "");
        await smtp.SendAsync(msg);
        await smtp.DisconnectAsync(true);
    }

    // Sem logo, ou com o MinIO fora, o e-mail sai só com o nome (AC 50): o envio não espera o armazenamento além do prazo.
    async Task<(byte[] Bytes, string Tipo)?> Logo(OneDb db, long instituicaoId)
    {
        // o filtro global já restringe à instituição atual, que os dois chamadores definem antes de enviar
        var imagem = await db.ImagensInstituicao.Where(x => x.InstituicaoId == instituicaoId && x.Tipo == "logo" && x.RemovidaEm == null).Select(x => new LogoGuardado(x.Conteudo, x.Chave)).FirstOrDefaultAsync();
        if (imagem is null) return null;
        using var prazo = new CancellationTokenSource(PrazoDoLogo);
        try
        {
            using var fluxo = await armazenamento.Baixar(imagem.Chave).WaitAsync(prazo.Token);
            using var ms = new MemoryStream();
            await fluxo.CopyToAsync(ms, prazo.Token);
            return (ms.ToArray(), imagem.Conteudo);
        }
        catch (Exception e) when (e is ArmazenamentoIndisponivel or OperationCanceledException or IOException)
        {
            log.LogWarning(e, "Logo da instituição {InstituicaoId} indisponível; o e-mail segue sem ele", instituicaoId);
            return null;
        }
    }

    record LogoGuardado(string Conteudo, string Chave);

    static string Escapar(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");

    public static string Html(string nome, string? cor, bool logo, string corpo)
    {
        var linhas = string.Join("<br>", corpo.Replace("\r", "").TrimEnd('\n').Split('\n').Select(Escapar));
        var imagem = logo ? $"<img src=\"cid:logo\" alt=\"{Escapar(nome)}\" style=\"max-height:40px;vertical-align:middle;margin-right:12px\">" : "";
        return $"<!DOCTYPE html><html><body style=\"margin:0;font-family:Arial,sans-serif;color:#1a1a1a\">" +
            $"<div style=\"background-color:{cor ?? CorPadrao};color:#ffffff;padding:16px 24px;font-size:18px\">{imagem}<span style=\"vertical-align:middle\">{Escapar(nome)}</span></div>" +
            $"<p style=\"padding:16px 24px;line-height:1.5\">{linhas}</p></body></html>";
    }
}
