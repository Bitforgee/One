using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Administracao.Shared;
using One.Api.Dados;

namespace One.Api.Administracao;

// A validação e a aplicação do cadastro de RespostaPronta, sobre os campos; ListarRespostasProntas e AlterarRespostaPronta usam as daqui.
public sealed record CriarRespostaPronta(CriarRespostaPronta.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(long? SetorId, string? Titulo, string? Texto);

    public static void Mapear(RouteGroupBuilder g) => g.MapPost("/respostas-prontas", (CriarRespostaPronta.Entrada i, IMediator m) => m.Send(new CriarRespostaPronta(i)));

    public static void Aplicar(RespostaPronta r, long? setorId, string? titulo, string? texto) { r.SetorId = setorId!.Value; r.Titulo = titulo!; r.Texto = texto!; }

    public static async Task<IResult?> Validar(OneDb db, long? setorId, string? titulo, string? texto, RespostaPronta? atual)
    {
        if (!await db.Setores.AnyAsync(s => s.Id == setorId)) return Problemas.Invalido("Setor inexistente.", "setorId");
        if (!AdminRotas.Nome(titulo, 200)) return Problemas.Invalido("Informe o título.", "titulo");
        if (string.IsNullOrWhiteSpace(texto) || texto.Length > 4000) return Problemas.Invalido("O texto deve ter de 1 a 4000 caracteres.", "texto");
        return await db.RespostasProntas.AnyAsync(r => r.SetorId == setorId && r.Titulo == titulo && r.Id != (atual == null ? 0 : atual.Id)) ? AdminRotas.Repetido("Já existe uma resposta pronta com este título no setor.") : null;
    }
}

public sealed class CriarRespostaProntaHandler(OneDb db) : IRequestHandler<CriarRespostaPronta, IResult>
{
    public async ValueTask<IResult> Handle(CriarRespostaPronta m, CancellationToken ct)
    {
        var e = m.Corpo;
        return await CadastroRotas.Criar<RespostaPronta, RespostaProntaResposta>(db, "/respostas-prontas", a => CriarRespostaPronta.Validar(db, e.SetorId, e.Titulo, e.Texto, a), s => CriarRespostaPronta.Aplicar(s, e.SetorId, e.Titulo, e.Texto), RespostaProntaResposta.De);
    }
}
