using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class ConversaMapeamento : IEntityTypeConfiguration<Conversa>
{
    public void Configure(EntityTypeBuilder<Conversa> e)
    {
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.AlunoId);
    }
}
