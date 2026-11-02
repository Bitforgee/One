using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

// A projeção, a validação e a aplicação do cadastro de RespostaPronta; ListarRespostasProntas e AlterarRespostaPronta usam as daqui.
public sealed record CriarRespostaPronta(RespostaProntaIn Corpo) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/respostas-prontas", (RespostaProntaIn i, IMediator m) => m.Send(new CriarRespostaPronta(i)));

    public static object Saida(RespostaPronta r) => new { id = r.Id, setorId = r.SetorId, titulo = r.Titulo, texto = r.Texto };

    public static void Aplicar(RespostaPronta r, RespostaProntaIn i) { r.SetorId = i.SetorId!.Value; r.Titulo = i.Titulo!; r.Texto = i.Texto!; }

    public static async Task<IResult?> Validar(OneDb db, RespostaProntaIn i, RespostaPronta? atual)
    {
        if (!await db.Setores.AnyAsync(s => s.Id == i.SetorId)) return Problemas.Invalido("Setor inexistente.", "setorId");
        if (!AdminRotas.Nome(i.Titulo, 200)) return Problemas.Invalido("Informe o título.", "titulo");
        if (string.IsNullOrWhiteSpace(i.Texto) || i.Texto.Length > 4000) return Problemas.Invalido("O texto deve ter de 1 a 4000 caracteres.", "texto");
        return await db.RespostasProntas.AnyAsync(r => r.SetorId == i.SetorId && r.Titulo == i.Titulo && r.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe uma resposta pronta com este título no setor.") : null;
    }
}

public sealed class CriarRespostaProntaHandler(OneDb db) : IRequestHandler<CriarRespostaPronta, IResult>
{
    public async ValueTask<IResult> Handle(CriarRespostaPronta m, CancellationToken ct) =>
        await CadastroRotas.Criar<RespostaPronta, RespostaProntaIn>(db, "/respostas-prontas", m.Corpo, CriarRespostaPronta.Saida, CriarRespostaPronta.Validar, CriarRespostaPronta.Aplicar);
}
