using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class MensagemConversaMapeamento : IEntityTypeConfiguration<MensagemConversa>
{
    public void Configure(EntityTypeBuilder<MensagemConversa> e)
    {
    }
}
