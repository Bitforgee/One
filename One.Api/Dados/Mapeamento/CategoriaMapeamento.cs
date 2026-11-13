using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class CategoriaMapeamento : IEntityTypeConfiguration<Categoria>
{
    public void Configure(EntityTypeBuilder<Categoria> e)
    {
        e.HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
    }
}
