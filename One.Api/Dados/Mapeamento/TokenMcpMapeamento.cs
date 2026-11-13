using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class TokenMcpMapeamento : IEntityTypeConfiguration<TokenMcp>
{
    public void Configure(EntityTypeBuilder<TokenMcp> e)
    {
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
        e.Property(x => x.Nome).HasMaxLength(60);
        e.Property(x => x.Hash).HasColumnType("char(64)");
        e.Property(x => x.Final).HasMaxLength(4);
        e.HasIndex(x => x.Hash).IsUnique();
    }
}
