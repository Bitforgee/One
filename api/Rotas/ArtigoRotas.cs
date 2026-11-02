using Microsoft.EntityFrameworkCore;
using One.Api.Assistente;
using One.Api.Dados;

namespace One.Api.Rotas;

public record ArtigoIn(string? Titulo, string[]? Perguntas, long? CategoriaId, string? Resposta, string[]? Links, DateOnly? VisivelDe = null, DateOnly? VisivelAte = null);

public static class ArtigoRotas
{
    public static void Mapear(RouteGroupBuilder api)
    {
        // Só atendentes e administradores veem a base interna; para os demais a versão "não existe" (AC 40).
        api.MapGet("/artigos/versoes/{id:long}", async (long id, HttpContext ctx, OneDb db) =>
        {
            var u = ctx.Usuario();
            if (!u.Tem(Papeis.Atendente) && !u.Tem(Papeis.Administrador)) return Problemas.Erro(404, "Versão de artigo não encontrada.");
            var v = await db.VersoesArtigo.Include(x => x.Artigo).FirstOrDefaultAsync(x => x.Id == id);
            if (v is null) return Problemas.Erro(404, "Versão de artigo não encontrada.");
            var atual = await db.VersoesArtigo.Where(x => x.ArtigoId == v.ArtigoId).OrderByDescending(x => x.Numero).Select(x => x.Id).FirstAsync();
            return Results.Ok(new
            {
                titulo = v.Titulo,
                texto = v.Resposta,
                links = v.Links,
                versaoAtivaAtualId = v.Artigo!.Estado == EstadosArtigo.Ativo && atual != v.Id ? atual : (long?)null,
            });
        });
    }

    // RAG, AC 6 e Surface: estado da indexação do trecho da versão atual; nulo quando o artigo nunca foi ativado nessa versão
    public static async Task<Dictionary<long, string>> Indexacao(OneDb db, List<long> versoes) =>
        (await db.TrechosFonte.Where(t => t.VersaoArtigoId != null && versoes.Contains(t.VersaoArtigoId.Value))
            .Select(t => new { Versao = t.VersaoArtigoId!.Value, Indexado = t.Embedding != null, t.Tentativas }).ToListAsync())
        .ToDictionary(t => t.Versao, t => t.Indexado ? "INDEXADO" : t.Tentativas >= 5 ? "FALHOU" : "PENDENTE");

    static object Saida(Artigo a, string categoria, Dictionary<long, string> indexacao)
    {
        var v = a.Versoes.OrderByDescending(x => x.Numero).First();
        return new
        {
            id = a.Id,
            estado = a.Estado,
            indexacao = indexacao.GetValueOrDefault(v.Id),
            categoriaId = a.CategoriaId,
            categoria,
            visivelDe = a.VisivelDe,
            visivelAte = a.VisivelAte,
            versao = new { id = v.Id, numero = v.Numero, titulo = v.Titulo, perguntas = v.Perguntas, resposta = v.Resposta, links = v.Links, criadaEm = v.CriadaEm },
        };
    }

    // AC 99 e 100: título, ao menos uma pergunta, categoria e resposta; links só http(s).
    static async Task<IResult?> Validar(OneDb db, ArtigoIn i)
    {
        if (string.IsNullOrWhiteSpace(i.Titulo) || i.Titulo.Length > 200) return Problemas.Invalido("Informe o título, com até 200 caracteres.", "titulo");
        if (i.Perguntas is null || !i.Perguntas.Any(p => !string.IsNullOrWhiteSpace(p))) return Problemas.Invalido("Informe ao menos uma pergunta relacionada.", "perguntas");
        if (!await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId)) return Problemas.Invalido("Escolha uma categoria.", "categoriaId");
        if (string.IsNullOrWhiteSpace(i.Resposta) || i.Resposta.Length > 8000) return Problemas.Invalido("Informe a resposta, com até 8000 caracteres.", "resposta");
        if ((i.Links ?? []).Any(l => !Uri.TryCreate(l, UriKind.Absolute, out var u) || u.Scheme is not ("http" or "https")))
            return Problemas.Invalido("Todo link deve começar com https:// ou http://.", "links");
        if (i.VisivelDe > i.VisivelAte) return Problemas.Invalido("O início da validade deve ser anterior ou igual ao fim.", "visivelDe"); // AC 150
        return null;
    }

    static VersaoArtigo Versao(ArtigoIn i, int numero, DateTime agora) => new()
    {
        Numero = numero,
        Titulo = i.Titulo!,
        Perguntas = i.Perguntas!.Where(p => !string.IsNullOrWhiteSpace(p)).ToList(),
        Resposta = i.Resposta!,
        Links = [.. i.Links ?? []],
        CriadaEm = agora,
    };

    static Task<Artigo?> Ler(OneDb db, long id) => db.Artigos.Include(a => a.Versoes).FirstOrDefaultAsync(a => a.Id == id);

    static async Task<IResult> Responder(OneDb db, Artigo a, int status = 200)
    {
        var atual = a.Versoes.Max(v => v.Id);
        var corpo = Saida(a, await db.Categorias.Where(c => c.Id == a.CategoriaId).Select(c => c.Nome).SingleAsync(), await Indexacao(db, [atual]));
        return status == 201 ? Results.Created($"/api/admin/artigos/{a.Id}", corpo) : Results.Ok(corpo);
    }

    // S7: o administrador escreve, versiona, ativa e arquiva; nada é apagado (versões append-only, door 6).
    public static void MapearAdmin(RouteGroupBuilder admin)
    {
        admin.MapGet("/artigos", async (OneDb db) =>
        {
            var categorias = await db.Categorias.ToDictionaryAsync(c => c.Id, c => c.Nome);
            var artigos = await db.Artigos.Include(a => a.Versoes).OrderBy(a => a.Id).ToListAsync();
            var indexacao = await Indexacao(db, artigos.Select(a => a.Versoes.OrderByDescending(v => v.Numero).First().Id).ToList());
            return Results.Ok(artigos.Select(a => Saida(a, categorias[a.CategoriaId], indexacao)));
        });

        admin.MapPost("/artigos", async (ArtigoIn i, OneDb db, TimeProvider relogio) =>
        {
            if (await Validar(db, i) is { } erro) return erro;
            var a = new Artigo { CategoriaId = i.CategoriaId!.Value, VisivelDe = i.VisivelDe, VisivelAte = i.VisivelAte, Versoes = [Versao(i, 1, relogio.GetUtcNow().UtcDateTime)] };
            db.Artigos.Add(a);
            await db.SaveChangesAsync();
            return await Responder(db, a, 201);
        });

        admin.MapPut("/artigos/{id:long}", async (long id, ArtigoIn i, OneDb db, TimeProvider relogio) =>
        {
            var a = await Ler(db, id);
            if (a is null) return Problemas.Erro(404, "Artigo não encontrado.");
            if (await Validar(db, i) is { } erro) return erro;
            a.CategoriaId = i.CategoriaId!.Value;
            (a.VisivelDe, a.VisivelAte) = (i.VisivelDe, i.VisivelAte);
            var agora = relogio.GetUtcNow().UtcDateTime;
            var nova = Versao(i, a.Versoes.Max(v => v.Numero) + 1, agora);
            a.Versoes.Add(nova);
            if (a.Estado == EstadosArtigo.Ativo) db.TrechosFonte.Add(Fontes.DoArtigo(nova, agora));
            await db.SaveChangesAsync();
            return await Responder(db, a);
        });

        admin.MapPost("/artigos/{id:long}/ativar", (long id, OneDb db, TimeProvider relogio) => Mudar(db, id, EstadosArtigo.Ativo, relogio));
        admin.MapPost("/artigos/{id:long}/arquivar", (long id, OneDb db, TimeProvider relogio) => Mudar(db, id, EstadosArtigo.Arquivado, relogio));
    }

    static async Task<IResult> Mudar(OneDb db, long id, string estado, TimeProvider relogio)
    {
        var a = await Ler(db, id);
        if (a is null) return Problemas.Erro(404, "Artigo não encontrado.");
        if (a.Estado == estado) return Problemas.Erro(409, estado == EstadosArtigo.Ativo ? "O artigo já está ativo." : "O artigo já está arquivado.");
        a.Estado = estado;
        var atual = a.Versoes.OrderByDescending(v => v.Numero).First();
        // reativar um artigo arquivado reaproveita o trecho que a versão atual já tem
        if (estado == EstadosArtigo.Ativo && !await db.TrechosFonte.AnyAsync(t => t.VersaoArtigoId == atual.Id))
            db.TrechosFonte.Add(Fontes.DoArtigo(atual, relogio.GetUtcNow().UtcDateTime));
        await db.SaveChangesAsync();
        return await Responder(db, a);
    }
}
