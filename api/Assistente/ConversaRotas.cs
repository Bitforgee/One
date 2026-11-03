using Microsoft.EntityFrameworkCore;
using One.Api.Chamados;
using One.Api.Dados;

namespace One.Api.Assistente;

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

    // 201 do chamado aberto pela transferência; cada caso de uso dá a forma da própria Resposta (numero, estado, setor).
    public static async Task<IResult> Transferido<TResposta>(OneDb db, Chamado chamado, Func<string, string, string, TResposta> resposta) =>
        Results.Created($"/api/chamados/{chamado.Numero}",
            resposta(chamado.Numero, chamado.Estado, await db.Setores.Where(s => s.Id == chamado.SetorId).Select(s => s.Nome).SingleAsync()));

    public static async Task<MensagemConversa> Responder(OneDb db, Assistente assistente, Conversa conversa, string mensagem, DateTime agora)
    {
        conversa.Mensagens.Add(new MensagemConversa { Autor = Aluno, Texto = mensagem, CriadaEm = agora });
        conversa.UltimaMensagemEm = agora;
        await db.SaveChangesAsync();
        var resposta = await assistente.Responder(conversa);
        conversa.Mensagens.Add(resposta);
        await db.SaveChangesAsync();
        return resposta;
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
