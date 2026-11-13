using MailKit.Net.Smtp;
using MailKit.Security;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using One.Api.Dados;

namespace One.Api;

public partial class EnviadorSmtp(IConfiguration cfg, Armazenamento armazenamento, ILogger<EnviadorSmtp> log)
{
    static readonly TimeSpan PrazoDoLogo = TimeSpan.FromSeconds(3);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")] public static partial Regex Valido();

    public async Task Enviar(OneDb db, Instituicao instituicao, string para, string assunto, string corpo)
    {
        var logo = await Logo(db, instituicao.Id);
        var msg = new MimeMessage();
        msg.From.Add(new MailboxAddress(instituicao.Nome, cfg["Smtp:Remetente"] ?? "nao-responda@one.local"));
        msg.To.Add(MailboxAddress.Parse(para));
        msg.Subject = assunto;
        var partes = new BodyBuilder { TextBody = corpo, HtmlBody = LayoutEmail.Html(instituicao.Nome, instituicao.Cor, logo is not null, corpo) };
        if (logo is { } l) partes.LinkedResources.Add("logo", l.Bytes, ContentType.Parse(l.Tipo)).ContentId = "logo";
        msg.Body = partes.ToMessageBody();

        using var smtp = new SmtpClient { Timeout = 10_000 };
        await smtp.ConnectAsync(cfg["Smtp:Host"] ?? "localhost", int.Parse(cfg["Smtp:Porta"] ?? "1025"), SecureSocketOptions.Auto);
        if (!string.IsNullOrEmpty(cfg["Smtp:Usuario"]))
            await smtp.AuthenticateAsync(cfg["Smtp:Usuario"]!, cfg["Smtp:Senha"] ?? "");
        await smtp.SendAsync(msg);
        await smtp.DisconnectAsync(true);
    }

    async Task<(byte[] Bytes, string Tipo)?> Logo(OneDb db, long instituicaoId)
    {
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
}