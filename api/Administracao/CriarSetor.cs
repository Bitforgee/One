using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

// A projeção, a validação e a aplicação do cadastro de Setor; ListarSetores e AlterarSetor usam as daqui.
public sealed record CriarSetor(SetorIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/setores", (SetorIn i, IMediator m) => m.Send(new CriarSetor(i)));

    public static object Saida(Setor s) => new { id = s.Id, nome = s.Nome, triagem = s.Triagem, ativo = s.Ativo };

    public static void Aplicar(Setor s, SetorIn i) { s.Nome = i.Nome!; s.Triagem = i.Triagem == true; s.Ativo = i.Ativo ?? true; }

    public static async Task<IResult?> Validar(OneDb db, SetorIn i, Setor? atual)
    {
        if (!AdminRotas.Nome(i.Nome)) return Problemas.Invalido("Informe o nome do setor.", "nome");
        // AC 113: a instituição fica sempre com exatamente um setor de triagem
        var triagens = await db.Setores.CountAsync(s => s.Triagem && s.Id != (atual == null ? 0 : atual.Id)) + (i.Triagem == true ? 1 : 0);
        if (triagens != 1) return Problemas.Invalido("A instituição precisa de exatamente um setor de triagem.", "triagem");
        return await db.Setores.AnyAsync(s => s.Nome == i.Nome && s.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe um setor com este nome.") : null;
    }
}

public sealed class CriarSetorHandler(OneDb db) : IRequestHandler<CriarSetor, IResult>
{
    public async ValueTask<IResult> Handle(CriarSetor m, CancellationToken ct) =>
        await CadastroRotas.Criar<Setor, SetorIn>(db, "/setores", m.Corpo, CriarSetor.Saida, CriarSetor.Validar, CriarSetor.Aplicar);
}
