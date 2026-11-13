using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class InstituicaoMapeamento : IEntityTypeConfiguration<Instituicao>
{
    public void Configure(EntityTypeBuilder<Instituicao> e)
    {
        e.Property(x => x.Slug).HasMaxLength(30);
        e.HasIndex(x => x.Slug).IsUnique();
    }
}
