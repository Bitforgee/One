using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class AtendenteSetorMapeamento : IEntityTypeConfiguration<AtendenteSetor>
{
    public void Configure(EntityTypeBuilder<AtendenteSetor> e)
    {
        e.HasOne<Usuario>().WithMany(u => u.Setores).HasForeignKey(x => x.UsuarioId);
        e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
    }
}
