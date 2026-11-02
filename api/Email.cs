using MailKit.Net.Smtp;
using MailKit.Security;
using System.Text.RegularExpressions;
using MimeKit;

namespace One.Api;

public partial class Email(IConfiguration cfg)
{
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")] public static partial Regex Valido();

    public async Task Enviar(string nomeRemetente, string para, string assunto, string corpo)
    {
        var msg = new MimeMessage();
        msg.From.Add(new MailboxAddress(nomeRemetente, cfg["Smtp:Remetente"] ?? "nao-responda@one.local"));
        msg.To.Add(MailboxAddress.Parse(para));
        msg.Subject = assunto;
        msg.Body = new TextPart("plain") { Text = corpo };

        using var smtp = new SmtpClient { Timeout = 10_000 };
        await smtp.ConnectAsync(cfg["Smtp:Host"] ?? "localhost", int.Parse(cfg["Smtp:Porta"] ?? "1025"), SecureSocketOptions.Auto);
        if (!string.IsNullOrEmpty(cfg["Smtp:Usuario"]))
            await smtp.AuthenticateAsync(cfg["Smtp:Usuario"]!, cfg["Smtp:Senha"] ?? "");
        await smtp.SendAsync(msg);
        await smtp.DisconnectAsync(true);
    }
}
