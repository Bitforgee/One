using Mediator;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record LancamentoMoodle(string Slug, string? IdToken, string? State) : IRequest<ResultadoLogin>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/moodle/{slug}/lancamento", async (string slug, HttpContext ctx, IMediator m) =>
        {
            var form = ctx.Request.HasFormContentType ? await ctx.Request.ReadFormAsync() : FormCollection.Empty;
            var e = await m.Send(new LancamentoMoodle(slug, form["id_token"], form["state"]));
            if (e.Principal is { } p) await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, p);
            return e.Resposta;
        }).AllowAnonymous().RequireRateLimiting("auth");
}

public sealed class LancamentoMoodleHandler(OneDb db, ValidadorLti validador, TimeProvider relogio) : IRequestHandler<LancamentoMoodle, ResultadoLogin>
{
    static ResultadoLogin Falha(IResult resposta) => new(null, resposta);

    static ResultadoLogin Voltar(Instituicao i, string motivo) => new(null, Results.Redirect($"/{i.Slug}?moodle={motivo}"));

    public async ValueTask<ResultadoLogin> Handle(LancamentoMoodle m, CancellationToken ct)
    {
        var i = await MoodleLti.Ativa(db, m.Slug, ct);
        if (i is null) return Falha(MoodleLti.NaoEncontrada());
        var p = await db.PlataformasMoodle.FirstOrDefaultAsync(x => x.Ativa, ct);
        if (p is null) return Falha(Problemas.Erro(400, "O Moodle não está cadastrado nesta instituição."));
        var nonce = await Consumir(m.State, ct);
        if (nonce is null) return Falha(Problemas.Erro(400, "O pedido de entrada expirou ou já foi usado. Abra o One pelo Moodle de novo."));
        var dados = string.IsNullOrEmpty(m.IdToken) ? null : await validador.Validar(p, m.IdToken, nonce, ct);
        if (dados is null) return Falha(Problemas.Erro(400, "O Moodle enviou uma identificação inválida."));
        return await Entrar(i, p, dados, ct);
    }

    async Task<string?> Consumir(string? state, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(state)) return null;
        var agora = relogio.GetUtcNow().UtcDateTime;
        var l = await db.LtiLancamentos.AsNoTracking().FirstOrDefaultAsync(x => x.State == state, ct);
        if (l is null) return null;
        var gravadas = await db.LtiLancamentos.Where(x => x.Id == l.Id && x.UsadoEm == null && x.ExpiraEm > agora)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.UsadoEm, agora), ct);
        return gravadas == 1 ? l.Nonce : null;
    }

    async Task<ResultadoLogin> Entrar(Instituicao i, PlataformaMoodle p, DadosLti d, CancellationToken ct)
    {
        var vinculo = await db.VinculosMoodle.FirstOrDefaultAsync(x => x.Emissor == p.Emissor && x.Sub == d.Sub, ct);
        var u = await Achar(vinculo, Cpf.Tentar(d.Username), ct);
        if (u is null) return Voltar(i, "sem-cadastro");
        if (!u.Ativo) return Voltar(i, "inativo");
        if (u.Papeis.Count != 1 || !u.Tem(Papeis.Aluno)) return Voltar(i, "use-senha");
        if (vinculo is null) await Vincular(u, p, d.Sub, ct);
        return new(Sessao.Principal(u), Results.Redirect($"/{i.Slug}"));
    }

    async Task<Usuario?> Achar(VinculoMoodle? vinculo, Cpf? cpf, CancellationToken ct)
    {
        var usuarios = db.Usuarios.Include(x => x.Papeis);
        if (vinculo is not null) return await usuarios.FirstOrDefaultAsync(x => x.Id == vinculo.UsuarioId, ct);
        return cpf is null ? null : await usuarios.FirstOrDefaultAsync(x => x.Cpf == cpf, ct);
    }

    async Task Vincular(Usuario u, PlataformaMoodle p, string sub, CancellationToken ct)
    {
        db.VinculosMoodle.Add(VinculoMoodle.Criar(u.Id, p.Emissor, sub, relogio.GetUtcNow().UtcDateTime));
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (Problemas.Conflito(e)) { db.ChangeTracker.Clear(); }
    }
}
