using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record PrimeiroAcesso(PrimeiroAcessoIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/auth/primeiro-acesso", (PrimeiroAcessoIn i, IMediator m) => m.Send(new PrimeiroAcesso(i))).AllowAnonymous().RequireRateLimiting("auth");
}

public sealed class PrimeiroAcessoHandler(OneDb db, TimeProvider relogio, Email email, IConfiguration cfg, ILogger<Email> log) : IRequestHandler<PrimeiroAcesso, IResult>
{
    public const string Mensagem = "Se o CPF estiver cadastrado, enviamos um link para o e-mail registrado na instituição.";

    public async ValueTask<IResult> Handle(PrimeiroAcesso m, CancellationToken ct)
    {
        var i = m.Corpo;
        var cpf = Cpf.Normalizar(i.Cpf);
        if (cpf is null) return Problemas.Invalido(AuthRotas.CpfInvalido, "cpf");

        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(x => x.Slug == i.Instituicao && x.Ativa);
        if (instituicao is not null)
        {
            db.InstituicaoAtual = instituicao.Id;
            var u = await db.Usuarios.FirstOrDefaultAsync(x => x.Cpf == cpf && x.Ativo);
            if (u is not null)
            {
                var (token, registro) = Tokens.Novo(instituicao.Slug, u.Id, relogio.GetUtcNow().UtcDateTime);
                db.Tokens.Add(registro);
                await db.SaveChangesAsync();
                try
                {
                    await email.Enviar(instituicao.Nome, u.Email, $"[{instituicao.Nome}] Crie sua senha",
                        $"Olá, {u.Nome}.\n\nPara criar sua senha no One, abra o link abaixo. Ele vale por 60 minutos e só pode ser usado uma vez.\n\n{Tokens.Link(cfg, instituicao.Slug, token)}\n");
                }
                catch (Exception e)
                {
                    log.LogError(e, "Falha ao enviar o e-mail de primeiro acesso da instituição {InstituicaoId} ({Slug})", instituicao.Id, instituicao.Slug);
                }
            }
        }
        return Results.Json(new { mensagem = Mensagem }, statusCode: 202);
    }
}
