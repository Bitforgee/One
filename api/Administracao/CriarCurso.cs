using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

// A projeção, a validação e a aplicação do cadastro de Curso; ListarCursos e AlterarCurso usam as daqui.
public sealed record CriarCurso(CursoIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/cursos", (CursoIn i, IMediator m) => m.Send(new CriarCurso(i)));

    public static object Saida(Curso c) => new { id = c.Id, nome = c.Nome, setorCoordenacaoId = c.SetorCoordenacaoId };

    public static void Aplicar(Curso c, CursoIn i) { c.Nome = i.Nome!; c.SetorCoordenacaoId = i.SetorCoordenacaoId; }

    public static async Task<IResult?> Validar(OneDb db, CursoIn i, Curso? atual)
    {
        if (!AdminRotas.Nome(i.Nome, 200)) return Problemas.Invalido("Informe o nome do curso.", "nome");
        if (i.SetorCoordenacaoId is { } s && !await db.Setores.AnyAsync(x => x.Id == s)) return Problemas.Invalido("Setor de coordenação inexistente.", "setorCoordenacaoId");
        return await db.Cursos.AnyAsync(c => c.Nome == i.Nome && c.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um curso com este nome.") : null;
    }
}

public sealed class CriarCursoHandler(OneDb db) : IRequestHandler<CriarCurso, IResult>
{
    public async ValueTask<IResult> Handle(CriarCurso m, CancellationToken ct) =>
        await CadastroRotas.Criar<Curso, CursoIn>(db, "/cursos", m.Corpo, CriarCurso.Saida, CriarCurso.Validar, CriarCurso.Aplicar);
}
