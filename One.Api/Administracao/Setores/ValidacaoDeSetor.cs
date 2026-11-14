using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao.Setores;

public static class ValidacaoDeSetor
{
    public static string Campo(Invalido erro) => erro.Motivo switch
    {
        Setor.MotivoNome => "nome",
        Setor.MotivoTurmaJunta or Setor.MotivoSemestre => "semestre",
        Setor.MotivoCurso => "cursoId",
        _ => "triagem",
    };

    public static async Task<IResult?> TriagemENome(OneDb db, string? nome, bool? triagem, long idAtual)
    {
        var triagens = await db.Setores.CountAsync(s => s.Triagem && s.Id != idAtual) + (triagem == true ? 1 : 0);
        if (triagens != 1) return Problemas.Invalido("A instituição precisa de exatamente um setor de triagem.", "triagem");
        return await db.Setores.AnyAsync(s => s.Nome == nome && s.Id != idAtual) ? ErrosDeAdmin.Repetido("Já existe um setor com este nome.") : null;
    }

    public static async Task<IResult?> LiderancaRepetida(OneDb db, long? curso, int? semestre, bool? ativo, long idAtual)
    {
        if (curso is null || ativo == false) return null;
        return await db.Setores.AnyAsync(s => s.CursoId == curso && s.Semestre == semestre && s.Ativo && s.Id != idAtual)
            ? ErrosDeAdmin.Repetido("Já existe uma liderança ativa para este curso e semestre.")
            : null;
    }
}
