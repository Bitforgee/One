using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed record CriarInstituicao(CriarInstituicao.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Slug, string? Nome, string? Fuso, Administrador? Admin);
    public sealed record Administrador(string? Cpf, string? Nome, string? Email);
    public sealed record Resposta(string Slug, string Nome, string Fuso, bool Ativa, DateTime CriadaEm, int Administradores);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/instituicoes", (Entrada i, IMediator m) => m.Send(new CriarInstituicao(i)));
}

public sealed class CriarInstituicaoHandler(OneDb db, TimeProvider relogio, IConfiguration cfg) : IRequestHandler<CriarInstituicao, IResult>
{
    const string EmUso = "Esse endereço já está em uso.";

    public async ValueTask<IResult> Handle(CriarInstituicao m, CancellationToken ct)
    {
        static string Valor(string? v) => v?.Trim() ?? "";
        var (e, a) = (m.Corpo, m.Corpo.Admin);
        var cpf = Cpf.Tentar(Valor(a?.Cpf));
        var n = new NovaInstituicao(Valor(e.Slug), Valor(e.Nome), Valor(e.Fuso), cpf?.Valor.Distinct().Count() > 1 ? cpf : null, Valor(a?.Nome), Valor(a?.Email));
        var erros = await Criacao.Validar(db, n);
        if (erros.FirstOrDefault(x => !x.Repetido) is { } invalido) return Problemas.Invalido(invalido.Mensagem, invalido.Campo);
        if (erros.Count > 0) return Problemas.Erro(409, EmUso);

        Instituicao i;
        try { (i, _) = await Criacao.Gravar(db, n, relogio.GetUtcNow().UtcDateTime, cfg); }
        catch (DbUpdateException ex) when (Problemas.Conflito(ex)) { return Problemas.Erro(409, EmUso); }
        return Results.Created($"/api/plataforma/instituicoes/{i.Slug}", new CriarInstituicao.Resposta(i.Slug, i.Nome, i.Fuso, i.Ativa, i.CriadaEm, 1));
    }
}
