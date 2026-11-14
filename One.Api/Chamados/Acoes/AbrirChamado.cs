using Microsoft.EntityFrameworkCore;
using One.Api.Chamados.Consulta;
using One.Api.Dados;

namespace One.Api.Chamados.Acoes;

public sealed record AbrirChamado(Conversa Conversa, Matricula Matricula, bool ComLideranca = true)
{
    public async Task<Chamado> Executar(OneDb db, Instituicao instituicao, DateTime agora)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        if (Conversa.Id == 0) await db.SaveChangesAsync();
        var (categoria, origem) = await Transferencia.EscolherCategoria(db, Conversa);
        var titulo = Cortar(Conversa.Mensagens.Where(m => m.Autor != MensagemConversa.AutorAssistente).OrderBy(m => m.Id).First().Texto, 120);
        var resumo = Transferencia.DoAssistente(Conversa).Select(m => m.Resumo).FirstOrDefault(r => !string.IsNullOrWhiteSpace(r)) is { } r ? Cortar(r, 500) : null;
        var rota = await ConsultasDeFluxo.Rotear(db, categoria, Matricula, ComLideranca);
        Conversa.Transferir(agora);

        var numero = await db.Database
            .SqlQuery<long>($"UPDATE instituicao SET ultimo_numero_chamado = ultimo_numero_chamado + 1 WHERE id = {instituicao.Id} RETURNING ultimo_numero_chamado AS \"Value\"")
            .ToListAsync();
        var chamado = Chamado.Abrir(new($"ONE-{numero.Single()}", titulo, resumo, new(Conversa.Id, Conversa.AlunoId, Matricula.Id, Matricula.Semestre),
            new(categoria.Id, origem, rota.SetorId, rota.Fluxo?.Vigente?.Id, rota.Passo?.Etapa.Ordem)), agora);
        db.Chamados.Add(chamado);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return chamado;
    }

    static string Cortar(string texto, int max) => texto.Length <= max ? texto : texto[..max];
}
