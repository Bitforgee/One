using Microsoft.EntityFrameworkCore;
using One.Api.Chamados;
using One.Api.Dados;

namespace One.Api.Rotas;

public record MensagemIn(string? Mensagem);
public record AvaliacaoIn(bool? Resolveu);
public record TransferirIn(long? MatriculaId);
public record AtendimentoDiretoIn(string? Descricao, long? MatriculaId);

public static class ConversaRotas
{
    public const string Aluno = "ALUNO";
    const int LimiteMensagensDoAluno = 10;

    static IResult? ValidarMensagem(string? m) =>
        string.IsNullOrWhiteSpace(m) || m.Length > 1000
            ? Problemas.Invalido("A mensagem deve ter de 1 a 1000 caracteres.", "mensagem")
            : null;

    static IResult NaoEncontrada() => Problemas.Erro(404, "Conversa não encontrada.");
    static IResult JaEncerrada() => Problemas.Erro(409, "Esta conversa já foi encerrada.");

    static Task<Conversa?> DoAluno(OneDb db, HttpContext ctx, long id) =>
        db.Conversas.Include(c => c.Mensagens).ThenInclude(m => m.Citacoes).FirstOrDefaultAsync(c => c.Id == id && c.AlunoId == ctx.Usuario().Id);

    static async Task<bool> PodeUsarAssistente(OneDb db, Usuario u) =>
        u.Tem(Papeis.Aluno) && await db.Matriculas.AnyAsync(m => m.UsuarioId == u.Id && m.Situacao == "ATIVA");

    static async Task<IResult> Transferido(OneDb db, Chamado chamado) =>
        Results.Created($"/api/chamados/{chamado.Numero}", new
        {
            numero = chamado.Numero,
            estado = chamado.Estado,
            setor = await db.Setores.Where(s => s.Id == chamado.SetorId).Select(s => s.Nome).SingleAsync(),
        });

    static async Task<object> Responder(OneDb db, Assistente.Assistente assistente, Conversa conversa, string mensagem, DateTime agora)
    {
        conversa.Mensagens.Add(new MensagemConversa { Autor = Aluno, Texto = mensagem, CriadaEm = agora });
        conversa.UltimaMensagemEm = agora;
        await db.SaveChangesAsync();
        var resposta = await assistente.Responder(conversa);
        conversa.Mensagens.Add(resposta);
        await db.SaveChangesAsync();
        return new { tipo = resposta.TipoFinal, texto = resposta.Texto };
    }

    public static void Mapear(RouteGroupBuilder api)
    {
        api.MapPost("/conversas", async (MensagemIn i, HttpContext ctx, OneDb db, Assistente.Assistente assistente, TimeProvider relogio) =>
        {
            var u = ctx.Usuario();
            if (!await PodeUsarAssistente(db, u)) return Problemas.Erro(403, "O assistente é só para alunos com matrícula ativa.");
            if (ValidarMensagem(i.Mensagem) is { } erro) return erro;

            var agora = relogio.GetUtcNow().UtcDateTime;
            var conversa = new Conversa { AlunoId = u.Id, CriadaEm = agora, UltimaMensagemEm = agora };
            db.Conversas.Add(conversa);
            var resposta = await Responder(db, assistente, conversa, i.Mensagem!, agora);
            return Results.Created($"/api/conversas/{conversa.Id}", new { conversaId = conversa.Id, resposta });
        }).RequireRateLimiting("mensagens");

        api.MapPost("/conversas/{id:long}/mensagens", async (long id, MensagemIn i, HttpContext ctx, OneDb db, Assistente.Assistente assistente, TimeProvider relogio) =>
        {
            var conversa = await DoAluno(db, ctx, id);
            if (conversa is null) return NaoEncontrada();
            if (ValidarMensagem(i.Mensagem) is { } erro) return erro;
            if (conversa.Desfecho is not null) return JaEncerrada();
            if (conversa.Mensagens.Count(m => m.Autor == Aluno) >= LimiteMensagensDoAluno)
                return Problemas.Erro(409, "A conversa chegou ao limite de 10 mensagens. Fale com um atendente ou encerre.");

            var resposta = await Responder(db, assistente, conversa, i.Mensagem!, relogio.GetUtcNow().UtcDateTime);
            return Results.Ok(new { resposta });
        }).RequireRateLimiting("mensagens");

        api.MapGet("/conversas/{id:long}", async (long id, HttpContext ctx, OneDb db) =>
        {
            var conversa = await DoAluno(db, ctx, id);
            if (conversa is null) return NaoEncontrada();
            var chamadoNumero = await db.Chamados.Where(c => c.ConversaId == id).Select(c => c.Numero).FirstOrDefaultAsync();
            return Results.Ok(new
            {
                conversa = new { id = conversa.Id, criadaEm = conversa.CriadaEm },
                mensagens = conversa.Mensagens.OrderBy(m => m.Id)
                    .Select(m => new { autor = m.Autor, texto = m.Texto, tipo = m.TipoFinal, criadaEm = m.CriadaEm }),
                desfecho = conversa.Desfecho,
                chamadoNumero,
            });
        });

        api.MapPost("/conversas/{id:long}/avaliacao", async (long id, AvaliacaoIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var conversa = await DoAluno(db, ctx, id);
            if (conversa is null) return NaoEncontrada();
            if (i.Resolveu is null) return Problemas.Invalido("Informe se a resposta resolveu.", "resolveu");
            if (conversa.Desfecho is not null) return JaEncerrada();
            if (i.Resolveu.Value)
            {
                conversa.Desfecho = Desfechos.Resolvida;
                conversa.DesfechoEm = relogio.GetUtcNow().UtcDateTime;
                await db.SaveChangesAsync();
            }
            return Results.Ok(new { desfecho = conversa.Desfecho });
        });

        api.MapPost("/conversas/{id:long}/transferir", async (long id, TransferirIn? i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var conversa = await DoAluno(db, ctx, id);
            if (conversa is null) return NaoEncontrada();
            if (conversa.Desfecho is not null) return JaEncerrada();
            var matricula = await Transferencia.Matricula(db, conversa.AlunoId, i?.MatriculaId);
            if (matricula is null) return Transferencia.MatriculaInvalida();
            return await Transferido(db, await Transferencia.Criar(db, ctx.Instituicao(), conversa, matricula, relogio.GetUtcNow().UtcDateTime));
        });

        // AC 57: atendente antes de qualquer mensagem, sem chamar o provedor de IA.
        api.MapPost("/atendimento-direto", async (AtendimentoDiretoIn i, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var u = ctx.Usuario();
            if (!await PodeUsarAssistente(db, u)) return Problemas.Erro(403, "O atendimento é só para alunos com matrícula ativa.");
            if (string.IsNullOrWhiteSpace(i.Descricao) || i.Descricao.Length > 2000)
                return Problemas.Invalido("A descrição deve ter de 1 a 2000 caracteres.", "descricao");
            var matricula = await Transferencia.Matricula(db, u.Id, i.MatriculaId);
            if (matricula is null) return Transferencia.MatriculaInvalida();

            var agora = relogio.GetUtcNow().UtcDateTime;
            var conversa = new Conversa { AlunoId = u.Id, CriadaEm = agora, UltimaMensagemEm = agora };
            conversa.Mensagens.Add(new MensagemConversa { Autor = Aluno, Texto = i.Descricao, CriadaEm = agora });
            db.Conversas.Add(conversa);
            return await Transferido(db, await Transferencia.Criar(db, ctx.Instituicao(), conversa, matricula, agora));
        }).RequireRateLimiting("mensagens");

        api.MapPost("/conversas/{id:long}/encerrar", async (long id, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var conversa = await DoAluno(db, ctx, id);
            if (conversa is null) return NaoEncontrada();
            if (conversa.Desfecho is not null) return JaEncerrada();
            conversa.Desfecho = Desfechos.Encerrada;
            conversa.DesfechoEm = relogio.GetUtcNow().UtcDateTime;
            await db.SaveChangesAsync();
            return Results.Ok(new { desfecho = conversa.Desfecho });
        });
    }
}
