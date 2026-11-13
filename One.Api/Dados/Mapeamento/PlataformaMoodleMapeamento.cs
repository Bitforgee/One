using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class PlataformaMoodleMapeamento : IEntityTypeConfiguration<PlataformaMoodle>
{
    public void Configure(EntityTypeBuilder<PlataformaMoodle> e)
    {
        e.HasIndex(x => x.InstituicaoId).IsUnique();
        foreach (var campo in new[] { nameof(PlataformaMoodle.Emissor), nameof(PlataformaMoodle.ClientId), nameof(PlataformaMoodle.DeploymentId), nameof(PlataformaMoodle.AuthUrl), nameof(PlataformaMoodle.JwksUrl) })
            e.Property(campo).HasMaxLength(500);
    }
}
