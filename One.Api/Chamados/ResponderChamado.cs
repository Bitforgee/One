using Mediator;
using One.Api.Conhecimento;
using One.Api.Dados;
using static One.Api.Chamados.AcoesChamado;
using static One.Api.Dados.Chamados.EstadosChamado;

namespace One.Api.Chamados;

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

    public static Task<(Arquivos.Lido?, IResult?)> LerAnexo(IFormFile f) =>
        Arquivos.Ler(f, MaxAnexo, [Arquivos.Pdf, Arquivos.Jpeg, Arquivos.Png], $"O arquivo {f.FileName} passa de 10 MB.", $"O arquivo {f.FileName} não é PDF, JPG nem PNG.");
}

public sealed class ResponderChamadoHandler(OneDb db, AcessoChamado a, Armazenamento armazenamento) : IRequestHandler<ResponderChamado, IResult>
{
    public async ValueTask<IResult> Handle(ResponderChamado m, CancellationToken ct)
    {
        var c = a.Chamado;
        if (m.Tipo == TiposMensagem.Nota) { c.Anotar(a.Usuario.Id, m.Texto, a.Agora); return Results.Empty; }
        var lidos = new List<Arquivos.Lido>();
        var anexos = new List<Anexo>();
        foreach (var f in m.Anexos)
        {
            var lido = (await ResponderChamado.LerAnexo(f)).Item1!;
            lidos.Add(lido);
            anexos.Add(new Anexo { Nome = lido.Nome, Tipo = lido.Tipo, Tamanho = lido.Bytes.Length, Chave = Armazenamento.NovaChave(a.Instituicao.Id, "anexos"), Hash = Armazenamento.Hash(lido.Bytes) });
        }
        async Task Guardar()
        {
            for (var i = 0; i < anexos.Count; i++) await armazenamento.Gravar(anexos[i].Chave, lidos[i].Bytes);
        }
        if (a.Papel == PermissoesChamado.Aluno)
        {
            if (c.Estado == Resolvido)
            {
                var r = await RejeitarResolucao(db, a, m.Texto, anexos);
                if (ReferenceEquals(r, Results.Empty)) await Guardar();
                return r;
            }
            c.ResponderComoAluno(a.Usuario.Id, m.Texto, anexos, a.Agora);
            await Guardar();
            return Results.Empty;
        }
        c.ResponderComoEquipe(a.Usuario.Id, a.Usuario.Nome, m.Texto, anexos, m.AguardaAluno, a.Agora);
        await Guardar();
        await Avisos.NovaResposta(db, a.Cfg, a.Instituicao, c, a.Agora);
        return Results.Empty;
    }
}
