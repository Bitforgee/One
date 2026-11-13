using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class DocumentoMapeamento : IEntityTypeConfiguration<Documento>
{
    public void Configure(EntityTypeBuilder<Documento> e)
    {
        e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
        e.HasMany(d => d.Versoes).WithOne(v => v.Documento).HasForeignKey(v => v.DocumentoId);
    }
}
