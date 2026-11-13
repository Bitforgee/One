using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class ChamadoMapeamento : IEntityTypeConfiguration<Chamado>
{
    public void Configure(EntityTypeBuilder<Chamado> e)
    {
        e.Property(x => x.Numero).HasMaxLength(20);
        e.HasIndex(x => new { x.InstituicaoId, x.Numero }).IsUnique();
        e.HasOne<Conversa>().WithOne().HasForeignKey<Chamado>(x => x.ConversaId);
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.SolicitanteId);
        e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.ResponsavelId);
        e.HasOne<Matricula>().WithMany().HasForeignKey(x => x.MatriculaId);
        e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
        e.HasOne<VersaoFluxo>().WithMany().HasForeignKey(x => x.VersaoFluxoId);
        e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
        e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaOriginalId);
        e.Property(x => x.Titulo).HasMaxLength(120);
        e.Property(x => x.Resumo).HasMaxLength(500);
        e.Property(x => x.Xmin).IsRowVersion();
    }
}
