using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Chamados;

public record ResolverIn(string? Texto);
public record RejeitarIn(string? Motivo);
public record CancelarIn(string? Motivo);
public record EncaminharIn(long? SetorId, string? Motivo);
public record ReclassificarIn(long? CategoriaId);
public record DuplicadoIn(string? NumeroOriginal);

public static class ChamadoRotas
{
    const string Aluno = "ALUNO";
    const string Atendente = "ATENDENTE";
    const int PrazoRejeicaoDias = 7;

    static readonly string[] Abertos = [Aberto, EmAtendimento, AguardandoAluno];
    static readonly string[] NaoFechados = [.. Abertos, Resolvido];

    // AC 89: ação x papel no chamado -> estados em que a ação vale. Par ausente = 403; estado fora da lista = 409.
    static readonly Dictionary<(string acao, string papel), string[]> Permitidas = new()
    {
        [("responder", Aluno)] = NaoFechados, // em RESOLVIDO vale como rejeição (AC 86)
        [("responder", Atendente)] = Abertos,
        [("nota", Atendente)] = NaoFechados,
        [("assumir", Atendente)] = Abertos,
        [("resolver", Atendente)] = Abertos,
        [("confirmar", Aluno)] = [Resolvido],
        [("rejeitar", Aluno)] = [Resolvido],
        [("cancelar", Aluno)] = Abertos,
        [("encaminhar", Atendente)] = Abertos,
        [("reclassificar", Atendente)] = NaoFechados,
        [("duplicado", Atendente)] = Abertos,
    };

    const long MaxAnexo = 10 * 1024 * 1024;

    // door 13: o tipo vem da assinatura do arquivo, não do nome nem do Content-Type enviado.
    static string? TipoPelaAssinatura(byte[] b) => b switch
    {
        [0x25, 0x50, 0x44, 0x46, ..] => "application/pdf",
        [0xFF, 0xD8, 0xFF, ..] => "image/jpeg",
        [0x89, 0x50, 0x4E, 0x47, ..] => "image/png",
        _ => null,
    };

    record Acesso(Chamado Chamado, string Papel, Usuario Usuario, DateTime Agora, Instituicao Instituicao, IConfiguration Cfg);

    static IResult NaoEncontrado() => Problemas.Erro(404, "Chamado não encontrado.");

    // Visível ao aluno solicitante e aos atendentes do setor atual; para os demais o chamado "não existe" (AC 72).
    static async Task<(Chamado?, string?)> Carregar(OneDb db, Usuario u, string numero)
    {
        var c = await db.Chamados.FirstOrDefaultAsync(x => x.Numero == numero);
        if (c is null) return (null, null);
        if (c.SolicitanteId == u.Id) return (c, Aluno);
        if (u.Tem(Papeis.Atendente) && await db.AtendenteSetores.AnyAsync(a => a.UsuarioId == u.Id && a.SetorId == c.SetorId)) return (c, Atendente);
        return (null, null);
    }

    static IEnumerable<string> Acoes(Chamado c, string papel, long usuarioId) =>
        Permitidas.Where(p => p.Key.papel == papel && p.Value.Contains(c.Estado))
            .Select(p => p.Key.acao)
            .Where(a => a != "assumir" || c.ResponsavelId != usuarioId);

    static void Evento(OneDb db, Acesso a, string tipo, string? de = null, string? para = null, string? detalhe = null) =>
        db.EventosChamado.Add(new EventoChamado { ChamadoId = a.Chamado.Id, Tipo = tipo, AtorId = a.Usuario.Id, De = de, Para = para, Detalhe = detalhe, CriadoEm = a.Agora });

    static void Mudar(OneDb db, Acesso a, string estado)
    {
        if (a.Chamado.Estado == estado) return;
        Evento(db, a, "TRANSICAO", a.Chamado.Estado, estado);
        a.Chamado.Estado = estado;
        a.Chamado.AguardandoDesde = estado == AguardandoAluno ? a.Agora : null;
        a.Chamado.LembreteEm = null;
    }

    static async Task Atribuir(OneDb db, Acesso a, long? responsavelId)
    {
        if (a.Chamado.ResponsavelId == responsavelId) return;
        var nomes = await db.Usuarios.Where(u => u.Id == a.Chamado.ResponsavelId || u.Id == responsavelId).ToDictionaryAsync(u => u.Id, u => u.Nome);
        Evento(db, a, "ATRIBUICAO", a.Chamado.ResponsavelId is { } de ? nomes[de] : null, responsavelId is { } para ? nomes[para] : null);
        a.Chamado.ResponsavelId = responsavelId;
    }

    static MensagemChamado Mensagem(OneDb db, Acesso a, string tipo, string texto)
    {
        var m = new MensagemChamado { ChamadoId = a.Chamado.Id, AutorId = a.Usuario.Id, Tipo = tipo, Texto = texto, CriadaEm = a.Agora };
        db.MensagensChamado.Add(m);
        Evento(db, a, tipo == "NOTA" ? "NOTA" : "RESPOSTA");
        return m;
    }

    static void Anexar(OneDb db, Acesso a, MensagemChamado m, List<Anexo> anexos)
    {
        foreach (var anexo in anexos)
        {
            m.Anexos.Add(anexo);
            Evento(db, a, "ANEXO", detalhe: anexo.Nome);
        }
    }

    // AC 122: resposta pública de atendente avisa o aluno por e-mail
    static async Task RespostaDaEquipe(OneDb db, Acesso a, string texto, List<Anexo>? anexos = null)
    {
        Anexar(db, a, Mensagem(db, a, "PUBLICA", texto), anexos ?? []);
        await Avisos.NovaResposta(db, a.Cfg, a.Instituicao, a.Chamado, a.Agora);
    }

    // AC 84 a 87: volta ao responsável ativo, ou à fila do setor se ele não existe mais.
    static async Task<IResult?> Rejeitar(OneDb db, Acesso a, string motivo, List<Anexo>? anexos = null)
    {
        if (a.Agora > a.Chamado.ResolvidoEm!.Value.AddDays(PrazoRejeicaoDias))
            return Problemas.Erro(409, "O prazo de 7 dias para rejeitar a resolução terminou.");
        Anexar(db, a, Mensagem(db, a, "PUBLICA", motivo), anexos ?? []);
        var ativo = a.Chamado.ResponsavelId is { } r && await db.Usuarios.AnyAsync(u => u.Id == r && u.Ativo);
        if (!ativo) await Atribuir(db, a, null);
        Mudar(db, a, ativo ? EmAtendimento : Aberto);
        a.Chamado.Reaberturas++;
        return null;
    }

    // Pipeline de toda ação: 404 visibilidade, 403 papel, 400 corpo, 409 estado; depois aplica e grava numa transação.
    static async Task<IResult> Agir(HttpContext ctx, OneDb db, TimeProvider relogio, string numero, string acao,
        Func<Acesso, Task<IResult?>> validar, Func<Acesso, Task<IResult?>> aplicar, bool criado = false)
    {
        var u = ctx.Usuario();
        var (chamado, papel) = await Carregar(db, u, numero);
        if (chamado is null) return NaoEncontrado();
        var a = new Acesso(chamado, papel!, u, relogio.GetUtcNow().UtcDateTime, ctx.Instituicao(), ctx.RequestServices.GetRequiredService<IConfiguration>());
        if (!Permitidas.TryGetValue((acao, papel!), out var estados)) return Problemas.Erro(403, "Seu papel neste chamado não permite esta ação.");
        if (await validar(a) is { } invalido) return invalido;
        if (!estados.Contains(chamado.Estado)) return Problemas.Erro(409, "A ação não é permitida no estado atual do chamado.");
        if (await aplicar(a) is { } recusa) return recusa;
        await db.SaveChangesAsync();
        var corpo = await Detalhe(db, ctx, chamado, papel!);
        return criado ? Results.Created($"/api/chamados/{numero}", corpo) : Results.Ok(corpo);
    }

    static IResult? Texto(string? texto, string campo, string mensagem) =>
        string.IsNullOrWhiteSpace(texto) || texto.Length > 4000 ? Problemas.Invalido(mensagem, campo) : null;

    static Task<IResult?> Nada(Acesso _) => Task.FromResult<IResult?>(null);

    public static void Mapear(RouteGroupBuilder api)
    {
        api.MapGet("/chamados", async (string? escopo, string? estado, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var u = ctx.Usuario();
            var agora = relogio.GetUtcNow().UtcDateTime;
            if (escopo == "fila")
            {
                if (!u.Tem(Papeis.Atendente)) return Results.Ok(Array.Empty<object>());
                var setores = db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId);
                var fila = await db.Chamados
                    .Where(c => setores.Contains(c.SetorId) && c.Estado != Fechado && (estado == null || c.Estado == estado))
                    .OrderBy(c => c.CriadoEm).ThenBy(c => c.Id)
                    .Select(c => new
                    {
                        c.Numero,
                        c.Titulo,
                        Categoria = db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).Single(),
                        c.Estado,
                        Responsavel = db.Usuarios.Where(x => x.Id == c.ResponsavelId).Select(x => x.Nome).SingleOrDefault(),
                        c.CriadoEm,
                    }).ToListAsync();
                return Results.Ok(fila.Select(c => new { numero = c.Numero, titulo = c.Titulo, categoria = c.Categoria, estado = c.Estado, responsavel = c.Responsavel, criadoEm = c.CriadoEm, dias = (int)(agora - c.CriadoEm).TotalDays }));
            }
            var meus = await db.Chamados.Where(c => c.SolicitanteId == u.Id && (estado == null || c.Estado == estado))
                .OrderByDescending(c => c.CriadoEm).ThenByDescending(c => c.Id)
                .Select(c => new { numero = c.Numero, titulo = c.Titulo, estado = c.Estado, criadoEm = c.CriadoEm })
                .ToListAsync();
            return Results.Ok(meus);
        });

        api.MapGet("/chamados/{numero}", async (string numero, HttpContext ctx, OneDb db) =>
        {
            var (chamado, papel) = await Carregar(db, ctx.Usuario(), numero);
            return chamado is null ? NaoEncontrado() : Results.Ok(await Detalhe(db, ctx, chamado, papel!));
        });

        api.MapPost("/chamados/{numero}/mensagens", async (string numero, HttpRequest req, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var form = req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty;
            var tipo = form["tipo"].ToString() is "NOTA" ? "NOTA" : "PUBLICA";
            var texto = form["texto"].ToString();
            var aguardaAluno = bool.TryParse(form["aguardaAluno"], out var x) && x;
            var arquivos = form.Files.GetFiles("anexos");
            var anexos = new List<Anexo>();

            return await Agir(ctx, db, relogio, numero, tipo == "NOTA" ? "nota" : "responder",
                async a =>
                {
                    if (Texto(texto, "texto", "A mensagem deve ter de 1 a 4000 caracteres.") is { } erro) return erro;
                    if (arquivos.Count > 0 && tipo == "NOTA") return Problemas.Invalido("Nota interna não aceita anexos.", "anexos");
                    // AC 127 e 128: PDF, JPG ou PNG de até 10 MB, conferidos pela assinatura
                    foreach (var f in arquivos)
                    {
                        if (f.Length > MaxAnexo) return Problemas.Erro(413, $"O arquivo {f.FileName} passa de 10 MB.");
                        using var ms = new MemoryStream();
                        await f.CopyToAsync(ms);
                        var bytes = ms.ToArray();
                        if (TipoPelaAssinatura(bytes) is not { } tipoArquivo) return Problemas.Erro(415, $"O arquivo {f.FileName} não é PDF, JPG nem PNG.");
                        anexos.Add(new Anexo { Nome = Path.GetFileName(f.FileName), Tipo = tipoArquivo, Tamanho = bytes.Length, Conteudo = bytes });
                    }
                    return null;
                },
                async a =>
                {
                    if (tipo == "NOTA") { Mensagem(db, a, "NOTA", texto); return null; }
                    if (a.Papel == Aluno)
                    {
                        if (a.Chamado.Estado == Resolvido) return await Rejeitar(db, a, texto, anexos); // AC 86
                        Anexar(db, a, Mensagem(db, a, "PUBLICA", texto), anexos);
                        if (a.Chamado.Estado == AguardandoAluno) Mudar(db, a, EmAtendimento);
                        return null;
                    }
                    await RespostaDaEquipe(db, a, texto, anexos);
                    if (a.Chamado.ResponsavelId is null) await Atribuir(db, a, a.Usuario.Id); // AC 77
                    Mudar(db, a, aguardaAluno ? AguardandoAluno : EmAtendimento);
                    return null;
                }, criado: true);
        });

        api.MapPost("/chamados/{numero}/assumir", (string numero, HttpContext ctx, OneDb db, TimeProvider relogio) =>
            Agir(ctx, db, relogio, numero, "assumir", Nada, async a =>
            {
                if (a.Chamado.ResponsavelId == a.Usuario.Id) return Problemas.Erro(409, "Você já é o responsável por este chamado.");
                await Atribuir(db, a, a.Usuario.Id);
                if (a.Chamado.Estado == Aberto) Mudar(db, a, EmAtendimento);
                return null;
            }));

        api.MapPost("/chamados/{numero}/resolver", (string numero, ResolverIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
            Agir(ctx, db, relogio, numero, "resolver",
                _ => Task.FromResult(Texto(i.Texto, "texto", "Escreva a resolução, com até 4000 caracteres.")),
                async a =>
                {
                    Mensagem(db, a, "PUBLICA", i.Texto!);
                    if (a.Chamado.ResponsavelId is null) await Atribuir(db, a, a.Usuario.Id);
                    Mudar(db, a, Resolvido);
                    a.Chamado.ResolvidoEm = a.Agora;
                    await Avisos.Resolvido(db, a.Cfg, a.Instituicao, a.Chamado, i.Texto!, a.Agora); // AC 123
                    return null;
                }));

        api.MapPost("/chamados/{numero}/confirmar", (string numero, HttpContext ctx, OneDb db, TimeProvider relogio) =>
            Agir(ctx, db, relogio, numero, "confirmar", Nada, a =>
            {
                Fechar(db, a, "CONFIRMADO", null);
                return Task.FromResult<IResult?>(null);
            }));

        api.MapPost("/chamados/{numero}/rejeitar", (string numero, RejeitarIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
            Agir(ctx, db, relogio, numero, "rejeitar",
                _ => Task.FromResult(Texto(i.Motivo, "motivo", "Explique o motivo da rejeição, com até 4000 caracteres.")),
                a => Rejeitar(db, a, i.Motivo!)));

        api.MapPost("/chamados/{numero}/cancelar", (string numero, CancelarIn? i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
            Agir(ctx, db, relogio, numero, "cancelar",
                _ => Task.FromResult(i?.Motivo is { Length: > 4000 } ? Problemas.Invalido("A justificativa pode ter até 4000 caracteres.", "motivo") : null),
                a =>
                {
                    Fechar(db, a, "CANCELADO", string.IsNullOrWhiteSpace(i?.Motivo) ? null : i.Motivo);
                    return Task.FromResult<IResult?>(null);
                }));

        api.MapPost("/chamados/{numero}/encaminhar", (string numero, EncaminharIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
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
                    Mensagem(db, a, "NOTA", i.Motivo!);
                    Evento(db, a, "ENCAMINHAMENTO", nomes[a.Chamado.SetorId], nomes[i.SetorId!.Value]);
                    await Atribuir(db, a, null);
                    Mudar(db, a, Aberto);
                    a.Chamado.SetorId = i.SetorId.Value;
                    a.Chamado.Encaminhamentos++;
                    return null;
                }));

        api.MapPost("/chamados/{numero}/reclassificar", (string numero, ReclassificarIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
            Agir(ctx, db, relogio, numero, "reclassificar",
                async _ => await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId && c.Ativa) ? null : Problemas.Invalido("Escolha uma categoria ativa.", "categoriaId"),
                async a =>
                {
                    var nomes = await db.Categorias.Where(c => c.Id == a.Chamado.CategoriaId || c.Id == i.CategoriaId).ToDictionaryAsync(c => c.Id, c => c.Nome);
                    Evento(db, a, "RECLASSIFICACAO", nomes[a.Chamado.CategoriaId], nomes[i.CategoriaId!.Value]);
                    a.Chamado.CategoriaId = i.CategoriaId.Value;
                    return null;
                }));

        MapearExtras(api);
    }

    static void MapearExtras(RouteGroupBuilder api)
    {
        // AC 148 e 149: só outro chamado do mesmo aluno; o duplicado sai dos indicadores
        api.MapPost("/chamados/{numero}/duplicado", (string numero, DuplicadoIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
            Agir(ctx, db, relogio, numero, "duplicado",
                async a => i.NumeroOriginal != a.Chamado.Numero && await db.Chamados.AnyAsync(c => c.Numero == i.NumeroOriginal && c.SolicitanteId == a.Chamado.SolicitanteId)
                    ? null : Problemas.Invalido("Informe outro chamado do mesmo aluno.", "numeroOriginal"),
                async a =>
                {
                    await RespostaDaEquipe(db, a, $"Este pedido continua em {i.NumeroOriginal}.");
                    a.Chamado.NumeroOriginal = i.NumeroOriginal;
                    Fechar(db, a, "DUPLICADO", null);
                    return null;
                }));

        // AC 147: respostas prontas do setor, só para quem atende nele
        api.MapGet("/respostas-prontas", async (long? setorId, HttpContext ctx, OneDb db) =>
        {
            var u = ctx.Usuario();
            if (!u.Tem(Papeis.Atendente) || !await db.AtendenteSetores.AnyAsync(a => a.UsuarioId == u.Id && a.SetorId == setorId))
                return Problemas.Erro(404, "Setor não encontrado.");
            return Results.Ok(await db.RespostasProntas.Where(r => r.SetorId == setorId).OrderBy(r => r.Titulo)
                .Select(r => new { id = r.Id, titulo = r.Titulo, texto = r.Texto }).ToListAsync());
        });

        // AC 129: o anexo segue o acesso ao chamado
        api.MapGet("/anexos/{id:long}", async (long id, HttpContext ctx, OneDb db) =>
        {
            var anexo = await db.Anexos.Where(x => x.Id == id)
                .Select(x => new { x.Nome, x.Tipo, x.Conteudo, Numero = db.Chamados.Where(c => db.MensagensChamado.Any(m => m.Id == x.MensagemChamadoId && m.ChamadoId == c.Id)).Select(c => c.Numero).Single() })
                .FirstOrDefaultAsync();
            if (anexo is null || (await Carregar(db, ctx.Usuario(), anexo.Numero)).Item1 is null) return Problemas.Erro(404, "Anexo não encontrado.");
            return Results.File(anexo.Conteudo, anexo.Tipo, anexo.Nome);
        });
    }

    static void Fechar(OneDb db, Acesso a, string motivo, string? justificativa)
    {
        Evento(db, a, "TRANSICAO", a.Chamado.Estado, Fechado, justificativa);
        a.Chamado.Estado = Fechado;
        a.Chamado.MotivoFechamento = motivo;
        a.Chamado.FechadoEm = a.Agora;
        a.Chamado.AguardandoDesde = null;
    }

    // AC 73 a 75: o aluno não recebe resumo, notas, eventos nem as fontes do assistente.
    static async Task<object> Detalhe(OneDb db, HttpContext ctx, Chamado c, string papel)
    {
        var equipe = papel == Atendente;
        var u = ctx.Usuario();
        var matricula = await db.Matriculas.Where(m => m.Id == c.MatriculaId).Select(m => new { numero = m.Numero, curso = m.Curso!.Nome, semestre = c.Semestre }).SingleAsync();
        var nomes = await db.Usuarios.Where(x => x.Id == c.SolicitanteId || x.Id == c.ResponsavelId
                || db.MensagensChamado.Any(m => m.ChamadoId == c.Id && m.AutorId == x.Id) || db.EventosChamado.Any(e => e.ChamadoId == c.Id && e.AtorId == x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Nome);
        var transcricao = await db.MensagensConversa.Where(m => m.ConversaId == c.ConversaId).OrderBy(m => m.Id)
            .Select(m => new { m.Id, m.Autor, m.Texto, m.CriadaEm, m.Citacoes }).ToListAsync();
        var mensagens = await db.MensagensChamado.Where(m => m.ChamadoId == c.Id && (equipe || m.Tipo == "PUBLICA")).OrderBy(m => m.Id).ToListAsync();
        var idsMensagens = mensagens.Select(m => m.Id).ToList();
        var anexos = (await db.Anexos.Where(x => idsMensagens.Contains(x.MensagemChamadoId)).OrderBy(x => x.Id)
            .Select(x => new { x.Id, x.MensagemChamadoId, x.Nome, x.Tipo, x.Tamanho }).ToListAsync()).ToLookup(x => x.MensagemChamadoId);

        var fontes = new Dictionary<long, object>();
        if (equipe)
        {
            // citação nova aponta para o trecho de fonte (artigo ou documento); as anteriores ao RAG, para a versão de artigo
            var citacoes = transcricao.SelectMany(m => m.Citacoes).ToList();
            var idsTrecho = citacoes.Where(x => x.TrechoFonteId != null).Select(x => x.TrechoFonteId!.Value).Distinct().ToList();
            var trechos = await db.TrechosFonte.Where(t => idsTrecho.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => (t.VersaoArtigoId, t.VersaoDocumentoId));
            long? VersaoArtigo(CitacaoArtigo x) => x.TrechoFonteId is { } t ? trechos[t].VersaoArtigoId : x.VersaoArtigoId;
            long? VersaoDocumento(CitacaoArtigo x) => x.TrechoFonteId is { } t ? trechos[t].VersaoDocumentoId : null;
            var idsArtigo = citacoes.Select(VersaoArtigo).OfType<long>().Distinct().ToList();
            var idsDocumento = citacoes.Select(VersaoDocumento).OfType<long>().Distinct().ToList();
            var artigos = await db.VersoesArtigo.Where(v => idsArtigo.Contains(v.Id))
                .Select(v => new
                {
                    v.Id,
                    v.Titulo,
                    v.Numero,
                    Atual = v.Artigo!.Estado == EstadosArtigo.Ativo ? db.VersoesArtigo.Where(x => x.ArtigoId == v.ArtigoId).OrderByDescending(x => x.Numero).Select(x => x.Id).First() : v.Id,
                }).ToDictionaryAsync(v => v.Id);
            var documentos = await db.VersoesDocumento.Where(v => idsDocumento.Contains(v.Id))
                .Select(v => new
                {
                    v.Id,
                    v.Documento!.Titulo,
                    v.Numero,
                    Atual = v.Documento.Estado == EstadosDocumento.Ativo ? db.VersoesDocumento.Where(x => x.DocumentoId == v.DocumentoId).OrderByDescending(x => x.Numero).Select(x => x.Id).First() : v.Id,
                }).ToDictionaryAsync(v => v.Id);
            object Fonte(CitacaoArtigo x) => VersaoDocumento(x) is { } d
                ? new { tipo = "DOCUMENTO", versaoArtigoId = (long?)null, versaoDocumentoId = (long?)d, titulo = documentos[d].Titulo, numero = documentos[d].Numero, trechos = x.Trechos, atualizado = documentos[d].Atual != d }
                : new { tipo = "ARTIGO", versaoArtigoId = VersaoArtigo(x), versaoDocumentoId = (long?)null, titulo = artigos[VersaoArtigo(x)!.Value].Titulo, numero = artigos[VersaoArtigo(x)!.Value].Numero, trechos = x.Trechos, atualizado = artigos[VersaoArtigo(x)!.Value].Atual != VersaoArtigo(x) };
            foreach (var m in transcricao.Where(m => m.Citacoes.Count > 0))
                fontes[m.Id] = m.Citacoes.Select(Fonte);
        }

        return new
        {
            numero = c.Numero,
            titulo = c.Titulo,
            estado = c.Estado,
            motivoFechamento = c.MotivoFechamento,
            numeroOriginal = c.NumeroOriginal,
            setorId = c.SetorId,
            setor = await db.Setores.Where(s => s.Id == c.SetorId).Select(s => s.Nome).SingleAsync(),
            categoria = await db.Categorias.Where(x => x.Id == c.CategoriaId).Select(x => x.Nome).SingleAsync(),
            responsavel = c.ResponsavelId is { } r ? nomes[r] : null,
            criadoEm = c.CriadoEm,
            resolvidoEm = c.ResolvidoEm,
            matricula,
            solicitante = equipe ? nomes[c.SolicitanteId] : null,
            resumo = equipe ? c.Resumo : null,
            origemCategoria = equipe ? c.OrigemCategoria : null,
            transcricao = transcricao.Select(m => equipe
                ? new { autor = m.Autor, texto = m.Texto, criadaEm = m.CriadaEm, fontes = fontes.GetValueOrDefault(m.Id) }
                : (object)new { autor = m.Autor, texto = m.Texto, criadaEm = m.CriadaEm }),
            mensagens = mensagens.Select(m => new { id = m.Id, tipo = m.Tipo, texto = m.Texto, autor = m.AutorId is { } a ? nomes[a] : "Sistema", doAluno = m.AutorId == c.SolicitanteId, criadaEm = m.CriadaEm, anexos = anexos[m.Id].Select(x => new { id = x.Id, nome = x.Nome, tipo = x.Tipo, tamanho = x.Tamanho }) }),
            eventos = equipe
                ? (await db.EventosChamado.Where(e => e.ChamadoId == c.Id).OrderBy(e => e.CriadoEm).ThenBy(e => e.Id).ToListAsync())
                    .Select(e => new { tipo = e.Tipo, ator = e.AtorId is { } a ? nomes[a] : "Sistema", de = e.De, para = e.Para, detalhe = e.Detalhe, criadoEm = e.CriadoEm })
                : null,
            acoes = Acoes(c, papel, u.Id),
            // destinos de encaminhar e reclassificar (S6), só para a equipe
            setores = equipe ? await db.Setores.Where(s => s.Ativo && s.Id != c.SetorId).OrderBy(s => s.Nome).Select(s => new { id = s.Id, nome = s.Nome }).ToListAsync() : null,
            categorias = equipe ? await db.Categorias.Where(x => x.Ativa).OrderBy(x => x.Nome).Select(x => new { id = x.Id, nome = x.Nome }).ToListAsync() : null,
        };
    }
}
