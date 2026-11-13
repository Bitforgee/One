using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class TokenAcessoMapeamento : IEntityTypeConfiguration<TokenAcesso>
{
    public void Configure(EntityTypeBuilder<TokenAcesso> e)
    {
        e.Property(x => x.Hash).HasColumnType("char(64)");
        e.HasIndex(x => x.Hash).IsUnique();
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
    }
}
