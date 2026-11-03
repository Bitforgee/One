using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Chamados;

public static class Transferencia
{
    public const string OrigemIa = "IA";
    public const string OrigemArtigo = "ARTIGO";
    public const string OrigemPadrao = "PADRAO";

    // AC 66: com uma única matrícula ativa ela é usada; com mais de uma, o aluno escolhe.
    public static async Task<Matricula?> Matricula(OneDb db, long alunoId, long? matriculaId)
    {
        var ativas = await db.Matriculas.Where(m => m.UsuarioId == alunoId && m.Situacao == "ATIVA").ToListAsync();
        return matriculaId is null
            ? (ativas.Count == 1 ? ativas[0] : null)
            : ativas.FirstOrDefault(m => m.Id == matriculaId);
    }

    public static IResult MatriculaInvalida() =>
        Problemas.Invalido("Escolha uma das suas matrículas ativas.", "matriculaId");

    // Cria o chamado da conversa numa transação com o número do contador da instituição (door 5).
    // A conversa (nova ou já gravada) precisa estar sem desfecho; quem chama já conferiu dono e matrícula.
    public static async Task<Chamado> Criar(OneDb db, Instituicao instituicao, Conversa conversa, Matricula matricula, DateTime agora)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        if (conversa.Id == 0) await db.SaveChangesAsync();
        var assistente = conversa.Mensagens.Where(m => m.Autor == Assistente.Assistente.Autor).OrderByDescending(m => m.Id).ToList();
        var categoriasAtivas = await db.Categorias.Where(c => c.Ativa).ToListAsync();

        var (categoriaId, origem) = (default(long?), OrigemPadrao);
        var sugerida = assistente.Select(m => m.CategoriaIdSugerida).FirstOrDefault(id => id is not null && categoriasAtivas.Any(c => c.Id == id));
        if (sugerida is not null) (categoriaId, origem) = (sugerida, OrigemIa);
        else if (assistente.FirstOrDefault(m => m.Citacoes.Count > 0) is { } citou)
        {
            var ultima = citou.Citacoes.OrderBy(c => c.Id).Last();
            categoriaId = await db.CategoriasCitadas().Where(x => x.CitacaoId == ultima.Id).Select(x => x.CategoriaId).SingleAsync();
            origem = OrigemArtigo;
        }
        var categoria = categoriaId is null ? categoriasAtivas.Single(c => c.Padrao) : await db.Categorias.SingleAsync(c => c.Id == categoriaId);

        var titulo = Cortar(conversa.Mensagens.Where(m => m.Autor != Assistente.Assistente.Autor).OrderBy(m => m.Id).First().Texto, 120);
        var resumo = assistente.Select(m => m.Resumo).FirstOrDefault(r => !string.IsNullOrWhiteSpace(r)) is { } r ? Cortar(r, 500) : null;
        var setorId = await Setor(db, categoria, matricula);
        conversa.Desfecho = Desfechos.Transferida;
        conversa.DesfechoEm = agora;

        // o UPDATE trava a linha da instituição até o commit: transferências simultâneas nunca repetem número
        var numero = await db.Database
            .SqlQuery<long>($"UPDATE instituicao SET ultimo_numero_chamado = ultimo_numero_chamado + 1 WHERE id = {instituicao.Id} RETURNING ultimo_numero_chamado AS \"Value\"")
            .ToListAsync();
        var chamado = Chamado.Abrir($"ONE-{numero.Single()}", conversa.Id, conversa.AlunoId, matricula.Id, matricula.Semestre, titulo, resumo, categoria.Id, origem, setorId, agora);
        db.Chamados.Add(chamado);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return chamado;
    }

    // AC 63 a 65: a regra da categoria decide o setor; sem regra ou sem coordenação, a triagem.
    static async Task<long> Setor(OneDb db, Categoria categoria, Matricula matricula)
    {
        var regra = categoria.Padrao ? null : await db.Regras.FirstOrDefaultAsync(r => r.CategoriaId == categoria.Id);
        var setor = regra?.Destino switch
        {
            "SETOR" => regra.SetorId,
            "COORDENACAO_CURSO" => await db.Cursos.Where(c => c.Id == matricula.CursoId).Select(c => c.SetorCoordenacaoId).SingleAsync(),
            _ => null,
        };
        return setor ?? await db.Setores.Where(s => s.Triagem).Select(s => s.Id).SingleAsync();
    }

    static string Cortar(string texto, int max) => texto.Length <= max ? texto : texto[..max];
}
