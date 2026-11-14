using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Conhecimento.Artigos;

public static class ArtigoComVersoes
{
    public static Task<Artigo?> Ler(OneDb db, long id) => db.Artigos.Include(a => a.Versoes).FirstOrDefaultAsync(a => a.Id == id);
}
