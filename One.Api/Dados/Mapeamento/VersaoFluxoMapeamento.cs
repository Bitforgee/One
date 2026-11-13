using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class VersaoFluxoMapeamento : IEntityTypeConfiguration<VersaoFluxo>
{
    public void Configure(EntityTypeBuilder<VersaoFluxo> e)
    {
        e.HasMany(x => x.Etapas).WithOne().HasForeignKey(x => x.VersaoFluxoId);
        e.HasIndex(x => new { x.FluxoId, x.Numero }).IsUnique();
        e.HasIndex(x => x.FluxoId).IsUnique().HasFilter("publicada_em IS NULL").HasDatabaseName("ux_versao_rascunho");
        e.Property(x => x.PublicadaEm).IsConcurrencyToken();
    }
}
