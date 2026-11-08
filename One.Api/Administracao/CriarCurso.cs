using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record CriarCurso(CriarCurso.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? Nome, long? SetorCoordenacaoId);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/cursos", (CriarCurso.Entrada i, IMediator m) => m.Send(new CriarCurso(i)));

    public static void Aplicar(Curso c, string? nome, long? setorCoordenacaoId) { c.Nome = nome!; c.SetorCoordenacaoId = setorCoordenacaoId; }

    public static async Task<IResult?> Validar(OneDb db, string? nome, long? setorCoordenacaoId, Curso? atual)
    {
        if (!AdminRotas.Nome(nome, 200)) return Problemas.Invalido("Informe o nome do curso.", "nome");
        if (setorCoordenacaoId is { } s && !await db.Setores.AnyAsync(x => x.Id == s)) return Problemas.Invalido("Setor de coordenação inexistente.", "setorCoordenacaoId");
        return await db.Cursos.AnyAsync(c => c.Nome == nome && c.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um curso com este nome.") : null;
    }
}

public sealed class CriarCursoHandler(OneDb db) : IRequestHandler<CriarCurso, IResult>
{
    public async ValueTask<IResult> Handle(CriarCurso m, CancellationToken ct)
    {
        var e = m.Corpo;
        return await CadastroRotas.Criar<Curso, CursoResposta>(db, "/cursos", a => CriarCurso.Validar(db, e.Nome, e.SetorCoordenacaoId, a), s => CriarCurso.Aplicar(s, e.Nome, e.SetorCoordenacaoId), CursoResposta.De);
    }
}
