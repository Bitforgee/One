using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class VinculoMoodleMapeamento : IEntityTypeConfiguration<VinculoMoodle>
{
    public void Configure(EntityTypeBuilder<VinculoMoodle> e)
    {
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
        e.Property(x => x.Emissor).HasMaxLength(500);
        e.Property(x => x.Sub).HasMaxLength(100);
        e.HasIndex(nameof(VinculoMoodle.InstituicaoId), nameof(VinculoMoodle.Emissor), nameof(VinculoMoodle.Sub)).IsUnique();
    }
}
