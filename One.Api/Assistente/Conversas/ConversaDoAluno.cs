using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Assistente.Conversas;

public static class ConversaDoAluno
{
    public const string Aluno = MensagemConversa.AutorAluno;

    public static IResult NaoEncontrada() => Problemas.Erro(404, "Conversa não encontrada.");
    public static IResult JaEncerrada() => Problemas.Erro(409, "Esta conversa já foi encerrada.");

    public static Task<Conversa?> DoAluno(OneDb db, Usuario aluno, long id) =>
        db.Conversas.Include(c => c.Mensagens).ThenInclude(m => m.Citacoes).Include(c => c.Mensagens).ThenInclude(m => m.Anexos)
            .FirstOrDefaultAsync(c => c.Id == id && c.AlunoId == aluno.Id);

    public static async Task<bool> PodeUsarAssistente(OneDb db, Usuario u) =>
        u.Tem(Papeis.Aluno) && await db.Matriculas.AnyAsync(m => m.UsuarioId == u.Id && m.Situacao == "ATIVA");

    public static async Task<IResult> Transferido<TResposta>(OneDb db, Chamado chamado, Func<string, string, string, TResposta> resposta) =>
        Results.Created($"/api/chamados/{chamado.Numero}",
            resposta(chamado.Numero, chamado.Estado, await db.Setores.Where(s => s.Id == chamado.SetorId).Select(s => s.Nome).SingleAsync()));
}
