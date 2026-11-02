using Mediator;
using One.Api.Conhecimento;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

// /mensagens: resposta pública ("responder") ou nota interna ("nota"), com anexos; door 6: o formulário é lido no lambda.
public sealed record ResponderChamado(string Numero, IFormCollection Form, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado
{
    const long MaxAnexo = 10 * 1024 * 1024;

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/chamados/{numero}/mensagens", async (string numero, HttpRequest req, HttpContext ctx, IMediator m) =>
            await m.Send(new ResponderChamado(numero, req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty, ctx.Usuario(), ctx.Instituicao())));

    public string Tipo => Form["tipo"].ToString() is TiposMensagem.Nota ? TiposMensagem.Nota : TiposMensagem.Publica;
    public string Texto => Form["texto"].ToString();
    public bool AguardaAluno => bool.TryParse(Form["aguardaAluno"], out var x) && x;
    public IReadOnlyList<IFormFile> Anexos => Form.Files.GetFiles("anexos");
    public string Acao => Tipo == TiposMensagem.Nota ? "nota" : "responder";
    public bool Criado => true;

    public async ValueTask<IResult?> Validar(AcessoChamado a, OneDb db)
    {
        if (AcoesChamado.Texto(Texto, "texto", "A mensagem deve ter de 1 a 4000 caracteres.") is { } erro) return erro;
        if (Anexos.Count > 0 && Tipo == TiposMensagem.Nota) return Problemas.Invalido("Nota interna não aceita anexos.", "anexos");
        foreach (var f in Anexos)
            if ((await LerAnexo(f)).Item2 is { } recusa) return recusa;
        return null;
    }

    // AC 127 e 128: PDF, JPG ou PNG de até 10 MB, conferidos pela assinatura
    public static Task<(Arquivos.Lido?, IResult?)> LerAnexo(IFormFile f) =>
        Arquivos.Ler(f, MaxAnexo, [Arquivos.Pdf, Arquivos.Jpeg, Arquivos.Png], $"O arquivo {f.FileName} passa de 10 MB.", $"O arquivo {f.FileName} não é PDF, JPG nem PNG.");
}

public sealed class ResponderChamadoHandler(OneDb db, AcessoChamado a) : IRequestHandler<ResponderChamado, IResult>
{
    public async ValueTask<IResult> Handle(ResponderChamado m, CancellationToken ct)
    {
        if (m.Tipo == TiposMensagem.Nota) { Mensagem(db, a, TiposMensagem.Nota, m.Texto); return Results.Empty; }
        var anexos = new List<Anexo>();
        foreach (var f in m.Anexos)
        {
            var lido = (await ResponderChamado.LerAnexo(f)).Item1!; // o Validar já recusou os inválidos
            anexos.Add(new Anexo { Nome = lido.Nome, Tipo = lido.Tipo, Tamanho = lido.Bytes.Length, Conteudo = lido.Bytes });
        }
        if (a.Papel == PermissoesChamado.Aluno)
        {
            if (a.Chamado.Estado == Resolvido) return await RejeitarResolucao(db, a, m.Texto, anexos); // AC 86
            Anexar(db, a, Mensagem(db, a, TiposMensagem.Publica, m.Texto), anexos);
            if (a.Chamado.Estado == AguardandoAluno) Mudar(db, a, EmAtendimento);
            return Results.Empty;
        }
        await RespostaDaEquipe(db, a, m.Texto, anexos);
        if (a.Chamado.ResponsavelId is null) await Atribuir(db, a, a.Usuario.Id); // AC 77
        Mudar(db, a, m.AguardaAluno ? AguardandoAluno : EmAtendimento);
        return Results.Empty;
    }
}
