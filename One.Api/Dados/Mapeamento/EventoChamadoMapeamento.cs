using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class EventoChamadoMapeamento : IEntityTypeConfiguration<EventoChamado>
{
    public void Configure(EntityTypeBuilder<EventoChamado> e)
    {
        e.HasOne<Chamado>().WithMany(c => c.Eventos).HasForeignKey(x => x.ChamadoId);
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.AtorId);
    }
}
