using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace One.Api.Dados.Mapeamento;

public sealed class CitacaoArtigoMapeamento : IEntityTypeConfiguration<CitacaoArtigo>
{
    public void Configure(EntityTypeBuilder<CitacaoArtigo> e)
    {
        e.HasOne<VersaoArtigo>().WithMany().HasForeignKey(x => x.VersaoArtigoId);
        e.HasOne<TrechoFonte>().WithMany().HasForeignKey(x => x.TrechoFonteId);
        e.ToTable(t => t.HasCheckConstraint("ck_citacao_artigo_fonte", "trecho_fonte_id IS NOT NULL OR versao_artigo_id IS NOT NULL"));
    }
}
