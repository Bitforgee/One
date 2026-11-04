using Microsoft.EntityFrameworkCore;
using One.Api.Conhecimento;
using One.Api.Dados;

namespace One.Api.Instituicoes;

// A carga inicial que o comando e a rota da plataforma dividem; o chamador já trocou db.InstituicaoAtual.
public static class CargaInicial
{
    public static async Task<Existentes> Existentes(OneDb db) =>
        new(await db.Setores.ToDictionaryAsync(s => s.Nome), await db.Categorias.ToDictionaryAsync(c => c.Nome),
            (await db.Cursos.Select(c => c.Nome).ToListAsync()).ToHashSet(), await db.Regras.Select(r => r.CategoriaId).ToListAsync());

    public static async Task<(int, int)> Gravar(OneDb db, ArquivoCarga arq, Existentes existentes, Plano plano, DateTime agora)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var novosSetores = plano.Setores.Values.Except(existentes.Setores.Values).ToList();
        var novasCategorias = plano.Categorias.Values.Except(existentes.Categorias.Values).ToList();
        db.Setores.AddRange(novosSetores);
        db.Categorias.AddRange(novasCategorias);
        await db.SaveChangesAsync();
        foreach (var (c, i) in (arq.Cursos ?? []).Select((c, i) => (c, i)))
            plano.Cursos[i].SetorCoordenacaoId = c.Coordenacao is null ? null : plano.Setores[c.Coordenacao].Id;
        db.Cursos.AddRange(plano.Cursos);
        foreach (var (regra, categoria, setor) in plano.Regras)
        {
            regra.CategoriaId = categoria.Id;
            regra.SetorId = setor?.Id;
            db.Regras.Add(regra);
        }
        foreach (var (a, categoria) in plano.Artigos)
        {
            var versao = new VersaoArtigo { Numero = 1, Titulo = a.Titulo!, Perguntas = a.Perguntas!, Resposta = a.Resposta!, Links = a.Links ?? [], CriadaEm = agora };
            var artigo = Artigo.Criar(categoria.Id, null, null, versao);
            artigo.Ativar();
            db.Artigos.Add(artigo);
            db.TrechosFonte.Add(Fontes.DoArtigo(versao, agora));
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return (novosSetores.Count, novasCategorias.Count);
    }
}
