using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class LtiLancamentoMapeamento : IEntityTypeConfiguration<LtiLancamento>
{
    public void Configure(EntityTypeBuilder<LtiLancamento> e)
    {
        e.Property(x => x.State).HasMaxLength(64);
        e.Property(x => x.Nonce).HasMaxLength(64);
        e.HasIndex(x => x.State).IsUnique();
    }
}
