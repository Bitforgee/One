using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed class ComandoOperador(OneDb db)
{
    public async Task<List<string>> Executar(Dictionary<string, string> o, bool remover, TextWriter saida)
    {
        var slug = o.GetValueOrDefault("slug") ?? "";
        var instituicao = await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == slug);
        if (instituicao is null) return [$"--slug: instituição \"{slug}\" não existe"];

        db.InstituicaoAtual = instituicao.Id;
        var cpf = Cpf.Tentar(o.GetValueOrDefault("cpf"));
        var usuario = await db.Usuarios.Include(u => u.Papeis).FirstOrDefaultAsync(u => u.Cpf == cpf);
        if (usuario is null) return [$"--cpf: não há usuário com o CPF \"{o.GetValueOrDefault("cpf")}\" em \"{slug}\""];
        if (!usuario.Ativo) return [$"--cpf: o usuário {usuario.Nome} está inativo"];

        if (remover) usuario.RemoverPapel(Papeis.Operador);
        else usuario.AdicionarPapel(Papeis.Operador);
        await db.SaveChangesAsync();
        saida.WriteLine($"Operador {usuario.Nome} {(remover ? "removido" : "adicionado")}.");
        return [];
    }
}
