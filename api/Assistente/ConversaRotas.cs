using Microsoft.EntityFrameworkCore;
using One.Api.Chamados;
using One.Api.Dados;

namespace One.Api.Assistente;

public record MensagemIn(string? Mensagem);
public record AvaliacaoIn(bool? Resolveu);
public record TransferirIn(long? MatriculaId);
public record AtendimentoDiretoIn(string? Descricao, long? MatriculaId);

// As rotas da conversa e os auxiliares que mais de um caso de uso da conversa usa.
public static class ConversaRotas
{
    public const string Aluno = "ALUNO";

    public static IResult? ValidarMensagem(string? m) =>
        string.IsNullOrWhiteSpace(m) || m.Length > 1000
            ? Problemas.Invalido("A mensagem deve ter de 1 a 1000 caracteres.", "mensagem")
            : null;

    public static IResult NaoEncontrada() => Problemas.Erro(404, "Conversa não encontrada.");
    public static IResult JaEncerrada() => Problemas.Erro(409, "Esta conversa já foi encerrada.");

    public static Task<Conversa?> DoAluno(OneDb db, Usuario aluno, long id) =>
        db.Conversas.Include(c => c.Mensagens).ThenInclude(m => m.Citacoes).FirstOrDefaultAsync(c => c.Id == id && c.AlunoId == aluno.Id);

    public static async Task<bool> PodeUsarAssistente(OneDb db, Usuario u) =>
        u.Tem(Papeis.Aluno) && await db.Matriculas.AnyAsync(m => m.UsuarioId == u.Id && m.Situacao == "ATIVA");

    public static async Task<IResult> Transferido(OneDb db, Chamado chamado) =>
        Results.Created($"/api/chamados/{chamado.Numero}", new
        {
            numero = chamado.Numero,
            estado = chamado.Estado,
            setor = await db.Setores.Where(s => s.Id == chamado.SetorId).Select(s => s.Nome).SingleAsync(),
        });

    public static async Task<object> Responder(OneDb db, Assistente assistente, Conversa conversa, string mensagem, DateTime agora)
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
        NovaConversa.Mapear(api);
        NovaMensagem.Mapear(api);
        VerConversa.Mapear(api);
        AvaliarConversa.Mapear(api);
        TransferirConversa.Mapear(api);
        // AC 57: atendente antes de qualquer mensagem, sem chamar o provedor de IA.
        AtendimentoDireto.Mapear(api);
        EncerrarConversa.Mapear(api);
    }
}
