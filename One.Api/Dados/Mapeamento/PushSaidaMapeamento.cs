using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class PushSaidaMapeamento : IEntityTypeConfiguration<PushSaida>
{
    public void Configure(EntityTypeBuilder<PushSaida> e)
    {
        e.HasOne<SubscricaoPush>().WithMany().HasForeignKey(x => x.SubscricaoId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne<Chamado>().WithMany().HasForeignKey(x => x.ChamadoId);
        e.Property(x => x.EnviadoEm).IsConcurrencyToken();
    }
}
