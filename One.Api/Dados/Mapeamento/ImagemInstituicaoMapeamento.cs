using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class ImagemInstituicaoMapeamento : IEntityTypeConfiguration<ImagemInstituicao>
{
    public void Configure(EntityTypeBuilder<ImagemInstituicao> e)
    {
        e.Property(x => x.Hash).HasColumnType("char(64)");
        e.HasIndex(nameof(ImagemInstituicao.InstituicaoId), nameof(ImagemInstituicao.Tipo)).IsUnique();
    }
}
