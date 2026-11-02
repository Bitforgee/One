using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public record ResolverIn(string? Texto);
public record RejeitarIn(string? Motivo);
public record CancelarIn(string? Motivo);
public record EncaminharIn(long? SetorId, string? Motivo);
public record ReclassificarIn(long? CategoriaId);
public record DuplicadoIn(string? NumeroOriginal);

// As ações sobre o chamado: cada uma valida o corpo e aplica a transição pelo mesmo pipeline (Agir).
public static class AcoesChamado
{
    const string Aluno = PermissoesChamado.Aluno;
    const long MaxAnexo = 10 * 1024 * 1024;

    record Acesso(Chamado Chamado, string Papel, Usuario Usuario, DateTime Agora, Instituicao Instituicao, IConfiguration Cfg, Prazos Prazos);

    public static void Mapear(RouteGroupBuilder api)
    {
        api.MapPost("/chamados/{numero}/mensagens", Mensagens);
        api.MapPost("/chamados/{numero}/assumir", Assumir);
        api.MapPost("/chamados/{numero}/resolver", Resolver);
        api.MapPost("/chamados/{numero}/confirmar", Confirmar);
        api.MapPost("/chamados/{numero}/rejeitar", Rejeitar);
        api.MapPost("/chamados/{numero}/cancelar", Cancelar);
        api.MapPost("/chamados/{numero}/encaminhar", Encaminhar);
        api.MapPost("/chamados/{numero}/reclassificar", Reclassificar);
        // AC 148 e 149: só outro chamado do mesmo aluno; o duplicado sai dos indicadores
        api.MapPost("/chamados/{numero}/duplicado", Duplicado);
    }

    // Pipeline de toda ação: 404 visibilidade, 403 papel, 400 corpo, 409 estado; depois aplica e grava numa transação.
    static async Task<IResult> Agir(HttpContext ctx, OneDb db, TimeProvider relogio, string numero, string acao,
        Func<Acesso, Task<IResult?>> validar, Func<Acesso, Task<IResult?>> aplicar, bool criado = false)
    {
        var u = ctx.Usuario();
        var (chamado, papel) = await ChamadoRotas.Carregar(db, u, numero);
        if (chamado is null) return ChamadoRotas.NaoEncontrado();
        var a = new Acesso(chamado, papel!, u, relogio.GetUtcNow().UtcDateTime, ctx.Instituicao(), ctx.RequestServices.GetRequiredService<IConfiguration>(), ctx.RequestServices.GetRequiredService<Prazos>());
        if (PermissoesChamado.Estados(acao, papel!) is not { } estados) return Problemas.Erro(403, "Seu papel neste chamado não permite esta ação.");
        if (await validar(a) is { } invalido) return invalido;
        if (!estados.Contains(chamado.Estado)) return Problemas.Erro(409, "A ação não é permitida no estado atual do chamado.");
        if (await aplicar(a) is { } recusa) return recusa;
        await db.SaveChangesAsync();
        var corpo = await DetalheChamado.Montar(db, u.Id, chamado, papel!);
        return criado ? Results.Created($"/api/chamados/{numero}", corpo) : Results.Ok(corpo);
    }

    static IResult? Texto(string? texto, string campo, string mensagem) =>
        string.IsNullOrWhiteSpace(texto) || texto.Length > 4000 ? Problemas.Invalido(mensagem, campo) : null;

    static Task<IResult?> Nada(Acesso _) => Task.FromResult<IResult?>(null);

    static Task<IResult?> Feito() => Task.FromResult<IResult?>(null);

    static async Task<IResult> Mensagens(string numero, HttpRequest req, HttpContext ctx, OneDb db, TimeProvider relogio)
    {
        var form = req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty;
        var tipo = form["tipo"].ToString() is TiposMensagem.Nota ? TiposMensagem.Nota : TiposMensagem.Publica;
        var texto = form["texto"].ToString();
        var aguardaAluno = bool.TryParse(form["aguardaAluno"], out var x) && x;
        var arquivos = form.Files.GetFiles("anexos");
        var anexos = new List<Anexo>();

        return await Agir(ctx, db, relogio, numero, tipo == TiposMensagem.Nota ? "nota" : "responder",
            _ => ValidarMensagem(tipo, texto, arquivos, anexos),
            a => AplicarMensagem(db, a, tipo, texto, aguardaAluno, anexos), criado: true);
    }

    static async Task<IResult?> ValidarMensagem(string tipo, string texto, IReadOnlyList<IFormFile> arquivos, List<Anexo> anexos)
    {
        if (Texto(texto, "texto", "A mensagem deve ter de 1 a 4000 caracteres.") is { } erro) return erro;
        if (arquivos.Count > 0 && tipo == TiposMensagem.Nota) return Problemas.Invalido("Nota interna não aceita anexos.", "anexos");
        // AC 127 e 128: PDF, JPG ou PNG de até 10 MB, conferidos pela assinatura
        foreach (var f in arquivos)
        {
            var (lido, recusa) = await Arquivos.Ler(f, MaxAnexo, [Arquivos.Pdf, Arquivos.Jpeg, Arquivos.Png],
                $"O arquivo {f.FileName} passa de 10 MB.", $"O arquivo {f.FileName} não é PDF, JPG nem PNG.");
            if (lido is null) return recusa;
            anexos.Add(new Anexo { Nome = lido.Nome, Tipo = lido.Tipo, Tamanho = lido.Bytes.Length, Conteudo = lido.Bytes });
        }
        return null;
    }

    static async Task<IResult?> AplicarMensagem(OneDb db, Acesso a, string tipo, string texto, bool aguardaAluno, List<Anexo> anexos)
    {
        if (tipo == TiposMensagem.Nota) { Mensagem(db, a, TiposMensagem.Nota, texto); return null; }
        if (a.Papel == Aluno)
        {
            if (a.Chamado.Estado == Resolvido) return await RejeitarResolucao(db, a, texto, anexos); // AC 86
            Anexar(db, a, Mensagem(db, a, TiposMensagem.Publica, texto), anexos);
            if (a.Chamado.Estado == AguardandoAluno) Mudar(db, a, EmAtendimento);
            return null;
        }
        await RespostaDaEquipe(db, a, texto, anexos);
        if (a.Chamado.ResponsavelId is null) await Atribuir(db, a, a.Usuario.Id); // AC 77
        Mudar(db, a, aguardaAluno ? AguardandoAluno : EmAtendimento);
        return null;
    }

    static Task<IResult> Assumir(string numero, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "assumir", Nada, async a =>
        {
            if (a.Chamado.ResponsavelId == a.Usuario.Id) return Problemas.Erro(409, "Você já é o responsável por este chamado.");
            await Atribuir(db, a, a.Usuario.Id);
            if (a.Chamado.Estado == Aberto) Mudar(db, a, EmAtendimento);
            return null;
        });

    static Task<IResult> Resolver(string numero, ResolverIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "resolver",
            _ => Task.FromResult(Texto(i.Texto, "texto", "Escreva a resolução, com até 4000 caracteres.")),
            async a =>
            {
                Mensagem(db, a, TiposMensagem.Publica, i.Texto!);
                if (a.Chamado.ResponsavelId is null) await Atribuir(db, a, a.Usuario.Id);
                Mudar(db, a, Resolvido);
                a.Chamado.ResolvidoEm = a.Agora;
                await Avisos.Resolvido(db, a.Cfg, a.Prazos, a.Instituicao, a.Chamado, i.Texto!, a.Agora); // AC 123
                return null;
            });

    static Task<IResult> Confirmar(string numero, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "confirmar", Nada, a =>
        {
            Fechar(db, a, MotivosFechamento.Confirmado, null);
            return Feito();
        });

    static Task<IResult> Rejeitar(string numero, RejeitarIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "rejeitar",
            _ => Task.FromResult(Texto(i.Motivo, "motivo", "Explique o motivo da rejeição, com até 4000 caracteres.")),
            a => RejeitarResolucao(db, a, i.Motivo!));

    static Task<IResult> Cancelar(string numero, CancelarIn? i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "cancelar",
            _ => Task.FromResult(i?.Motivo is { Length: > 4000 } ? Problemas.Invalido("A justificativa pode ter até 4000 caracteres.", "motivo") : null),
            a =>
            {
                Fechar(db, a, MotivosFechamento.Cancelado, string.IsNullOrWhiteSpace(i?.Motivo) ? null : i.Motivo);
                return Feito();
            });

    static Task<IResult> Encaminhar(string numero, EncaminharIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "encaminhar",
            async a =>
            {
                if (string.IsNullOrWhiteSpace(i.Motivo) || i.Motivo.Length > 4000) return Problemas.Invalido("Explique o motivo do encaminhamento.", "motivo");
                if (i.SetorId == a.Chamado.SetorId || !await db.Setores.AnyAsync(s => s.Id == i.SetorId && s.Ativo))
                    return Problemas.Invalido("Escolha outro setor ativo.", "setorId");
                return null;
            },
            async a =>
            {
                var nomes = await db.Setores.Where(s => s.Id == a.Chamado.SetorId || s.Id == i.SetorId).ToDictionaryAsync(s => s.Id, s => s.Nome);
                Mensagem(db, a, TiposMensagem.Nota, i.Motivo!);
                Evento(db, a, TiposEvento.Encaminhamento, nomes[a.Chamado.SetorId], nomes[i.SetorId!.Value]);
                await Atribuir(db, a, null);
                Mudar(db, a, Aberto);
                a.Chamado.SetorId = i.SetorId.Value;
                a.Chamado.Encaminhamentos++;
                return null;
            });

    static Task<IResult> Reclassificar(string numero, ReclassificarIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "reclassificar",
            async _ => await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId && c.Ativa) ? null : Problemas.Invalido("Escolha uma categoria ativa.", "categoriaId"),
            async a =>
            {
                var nomes = await db.Categorias.Where(c => c.Id == a.Chamado.CategoriaId || c.Id == i.CategoriaId).ToDictionaryAsync(c => c.Id, c => c.Nome);
                Evento(db, a, TiposEvento.Reclassificacao, nomes[a.Chamado.CategoriaId], nomes[i.CategoriaId!.Value]);
                a.Chamado.CategoriaId = i.CategoriaId.Value;
                return null;
            });

    static Task<IResult> Duplicado(string numero, DuplicadoIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        Agir(ctx, db, relogio, numero, "duplicado",
            async a => i.NumeroOriginal != a.Chamado.Numero && await db.Chamados.AnyAsync(c => c.Numero == i.NumeroOriginal && c.SolicitanteId == a.Chamado.SolicitanteId)
                ? null : Problemas.Invalido("Informe outro chamado do mesmo aluno.", "numeroOriginal"),
            async a =>
            {
                await RespostaDaEquipe(db, a, $"Este pedido continua em {i.NumeroOriginal}.");
                a.Chamado.NumeroOriginal = i.NumeroOriginal;
                Fechar(db, a, MotivosFechamento.Duplicado, null);
                return null;
            });

    static void Evento(OneDb db, Acesso a, string tipo, string? de = null, string? para = null, string? detalhe = null) =>
        db.EventosChamado.Add(new EventoChamado { ChamadoId = a.Chamado.Id, Tipo = tipo, AtorId = a.Usuario.Id, De = de, Para = para, Detalhe = detalhe, CriadoEm = a.Agora });

    static void Mudar(OneDb db, Acesso a, string estado)
    {
        if (a.Chamado.Estado == estado) return;
        Evento(db, a, TiposEvento.Transicao, a.Chamado.Estado, estado);
        a.Chamado.Estado = estado;
        a.Chamado.AguardandoDesde = estado == AguardandoAluno ? a.Agora : null;
        a.Chamado.LembreteEm = null;
    }

    static void Fechar(OneDb db, Acesso a, string motivo, string? justificativa)
    {
        Evento(db, a, TiposEvento.Transicao, a.Chamado.Estado, Fechado, justificativa);
        a.Chamado.Estado = Fechado;
        a.Chamado.MotivoFechamento = motivo;
        a.Chamado.FechadoEm = a.Agora;
        a.Chamado.AguardandoDesde = null;
    }

    static async Task Atribuir(OneDb db, Acesso a, long? responsavelId)
    {
        if (a.Chamado.ResponsavelId == responsavelId) return;
        var nomes = await db.Usuarios.Where(u => u.Id == a.Chamado.ResponsavelId || u.Id == responsavelId).ToDictionaryAsync(u => u.Id, u => u.Nome);
        Evento(db, a, TiposEvento.Atribuicao, a.Chamado.ResponsavelId is { } de ? nomes[de] : null, responsavelId is { } para ? nomes[para] : null);
        a.Chamado.ResponsavelId = responsavelId;
    }

    static MensagemChamado Mensagem(OneDb db, Acesso a, string tipo, string texto)
    {
        var m = new MensagemChamado { ChamadoId = a.Chamado.Id, AutorId = a.Usuario.Id, Tipo = tipo, Texto = texto, CriadaEm = a.Agora };
        db.MensagensChamado.Add(m);
        Evento(db, a, tipo == TiposMensagem.Nota ? TiposEvento.Nota : TiposEvento.Resposta);
        return m;
    }

    static void Anexar(OneDb db, Acesso a, MensagemChamado m, List<Anexo> anexos)
    {
        foreach (var anexo in anexos)
        {
            m.Anexos.Add(anexo);
            Evento(db, a, TiposEvento.Anexo, detalhe: anexo.Nome);
        }
    }

    // AC 122: resposta pública de atendente avisa o aluno por e-mail
    static async Task RespostaDaEquipe(OneDb db, Acesso a, string texto, List<Anexo>? anexos = null)
    {
        Anexar(db, a, Mensagem(db, a, TiposMensagem.Publica, texto), anexos ?? []);
        await Avisos.NovaResposta(db, a.Cfg, a.Instituicao, a.Chamado, a.Agora);
    }

    // AC 84 a 87: volta ao responsável ativo, ou à fila do setor se ele não existe mais.
    static async Task<IResult?> RejeitarResolucao(OneDb db, Acesso a, string motivo, List<Anexo>? anexos = null)
    {
        if (a.Agora > a.Chamado.ResolvidoEm!.Value + a.Prazos.Rejeicao)
            return Problemas.Erro(409, $"O prazo de {a.Prazos.RejeicaoDias} dias para rejeitar a resolução terminou.");
        Anexar(db, a, Mensagem(db, a, TiposMensagem.Publica, motivo), anexos ?? []);
        var ativo = a.Chamado.ResponsavelId is { } r && await db.Usuarios.AnyAsync(u => u.Id == r && u.Ativo);
        if (!ativo) await Atribuir(db, a, null);
        Mudar(db, a, ativo ? EmAtendimento : Aberto);
        a.Chamado.Reaberturas++;
        return null;
    }
}
