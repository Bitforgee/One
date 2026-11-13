using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class ArtigoMapeamento : IEntityTypeConfiguration<Artigo>
{
    public void Configure(EntityTypeBuilder<Artigo> e)
    {
        e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
        e.HasMany(a => a.Versoes).WithOne(v => v.Artigo).HasForeignKey(v => v.ArtigoId);
    }
}
