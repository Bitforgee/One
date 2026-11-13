using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class SubscricaoPushMapeamento : IEntityTypeConfiguration<SubscricaoPush>
{
    public void Configure(EntityTypeBuilder<SubscricaoPush> e)
    {
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
        e.HasIndex(x => x.Endpoint).IsUnique();
    }
}
