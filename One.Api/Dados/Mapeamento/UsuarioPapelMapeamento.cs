using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class UsuarioPapelMapeamento : IEntityTypeConfiguration<UsuarioPapel>
{
    public void Configure(EntityTypeBuilder<UsuarioPapel> e)
    {
        e.HasIndex(x => new { x.UsuarioId, x.Papel }).IsUnique();
    }
}
