using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using One.Api.Dados.Mapeamento;

namespace One.Api.Dados;

public class OneDb(DbContextOptions<OneDb> options) : DbContext(options)
{
    public long? InstituicaoAtual { get; set; }

    public DbSet<Instituicao> Instituicoes => Set<Instituicao>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<UsuarioPapel> UsuarioPapeis => Set<UsuarioPapel>();
    public DbSet<Setor> Setores => Set<Setor>();
    public DbSet<AtendenteSetor> AtendenteSetores => Set<AtendenteSetor>();
    public DbSet<Curso> Cursos => Set<Curso>();
    public DbSet<Matricula> Matriculas => Set<Matricula>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Fluxo> Fluxos => Set<Fluxo>();
    public DbSet<VersaoFluxo> VersoesFluxo => Set<VersaoFluxo>();
    public DbSet<EtapaFluxo> EtapasFluxo => Set<EtapaFluxo>();
    public DbSet<Artigo> Artigos => Set<Artigo>();
    public DbSet<VersaoArtigo> VersoesArtigo => Set<VersaoArtigo>();
    public DbSet<TokenAcesso> Tokens => Set<TokenAcesso>();
    public DbSet<Conversa> Conversas => Set<Conversa>();
    public DbSet<MensagemConversa> MensagensConversa => Set<MensagemConversa>();
    public DbSet<CitacaoArtigo> Citacoes => Set<CitacaoArtigo>();
    public DbSet<AnexoConversa> AnexosConversa => Set<AnexoConversa>();
    public DbSet<Chamado> Chamados => Set<Chamado>();
    public DbSet<MensagemChamado> MensagensChamado => Set<MensagemChamado>();
    public DbSet<Anexo> Anexos => Set<Anexo>();
    public DbSet<EventoChamado> EventosChamado => Set<EventoChamado>();
    public DbSet<RespostaPronta> RespostasProntas => Set<RespostaPronta>();
    public DbSet<EmailSaida> EmailsSaida => Set<EmailSaida>();
    public DbSet<Documento> Documentos => Set<Documento>();
    public DbSet<VersaoDocumento> VersoesDocumento => Set<VersaoDocumento>();
    public DbSet<TrechoFonte> TrechosFonte => Set<TrechoFonte>();
    public DbSet<SubscricaoPush> SubscricoesPush => Set<SubscricaoPush>();
    public DbSet<PushSaida> PushesSaida => Set<PushSaida>();
    public DbSet<ImagemInstituicao> ImagensInstituicao => Set<ImagemInstituicao>();
    public DbSet<PlataformaMoodle> PlataformasMoodle => Set<PlataformaMoodle>();
    public DbSet<VinculoMoodle> VinculosMoodle => Set<VinculoMoodle>();
    public DbSet<LtiLancamento> LtiLancamentos => Set<LtiLancamento>();
    public DbSet<TokenMcp> TokensMcp => Set<TokenMcp>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasPostgresExtension("vector");
mb.ApplyConfiguration(new InstituicaoMapeamento());
        mb.ApplyConfiguration(new ImagemInstituicaoMapeamento());
        mb.ApplyConfiguration(new PlataformaMoodleMapeamento());
        mb.ApplyConfiguration(new VinculoMoodleMapeamento());
        mb.ApplyConfiguration(new LtiLancamentoMapeamento());
        mb.ApplyConfiguration(new TokenMcpMapeamento());
        mb.ApplyConfiguration(new UsuarioMapeamento());
        mb.ApplyConfiguration(new UsuarioPapelMapeamento());
        mb.ApplyConfiguration(new SetorMapeamento());
        mb.ApplyConfiguration(new CategoriaMapeamento());
        mb.ApplyConfiguration(new AtendenteSetorMapeamento());
        mb.ApplyConfiguration(new CursoMapeamento());
        mb.ApplyConfiguration(new MatriculaMapeamento());
        mb.ApplyConfiguration(new FluxoMapeamento());
        mb.ApplyConfiguration(new VersaoFluxoMapeamento());
        mb.ApplyConfiguration(new EtapaFluxoMapeamento());
        mb.ApplyConfiguration(new ArtigoMapeamento());
        mb.ApplyConfiguration(new VersaoArtigoMapeamento());
        mb.ApplyConfiguration(new TokenAcessoMapeamento());
        mb.ApplyConfiguration(new ConversaMapeamento());
        mb.ApplyConfiguration(new CitacaoArtigoMapeamento());
        mb.ApplyConfiguration(new DocumentoMapeamento());
        mb.ApplyConfiguration(new VersaoDocumentoMapeamento());
        mb.ApplyConfiguration(new TrechoFonteMapeamento());
        mb.ApplyConfiguration(new SubscricaoPushMapeamento());
        mb.ApplyConfiguration(new PushSaidaMapeamento());
        mb.ApplyConfiguration(new ChamadoMapeamento());
        mb.ApplyConfiguration(new MensagemChamadoMapeamento());
        mb.ApplyConfiguration(new AnexoMapeamento());
        mb.ApplyConfiguration(new AnexoConversaMapeamento());
        mb.ApplyConfiguration(new EventoChamadoMapeamento());
        mb.ApplyConfiguration(new RespostaProntaMapeamento());
        mb.ApplyConfiguration(new MensagemConversaMapeamento());
        mb.ApplyConfiguration(new EmailSaidaMapeamento());

        var configurar = GetType().GetMethod(nameof(DaInstituicao), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        foreach (var tipo in mb.Model.GetEntityTypes().Select(e => e.ClrType).Where(t => typeof(IDaInstituicao).IsAssignableFrom(t)).ToList())
            configurar.MakeGenericMethod(tipo).Invoke(this, [mb]);

        foreach (var e in mb.Model.GetEntityTypes().OrderBy(t => t.ClrType.Name, StringComparer.Ordinal).ToList())
        {
            e.SetTableName(Snake(e.ClrType.Name));
            foreach (var p in e.GetProperties()) p.SetColumnName(Snake(p.Name));
            foreach (var k in e.GetKeys()) k.SetName(Snake(k.GetName()!));
            foreach (var fk in e.GetForeignKeys()) fk.SetConstraintName(Snake(fk.GetConstraintName()!));
            foreach (var ix in e.GetIndexes()) ix.SetDatabaseName(Snake(ix.GetDatabaseName()!));
        }
    }

    void DaInstituicao<T>(ModelBuilder mb) where T : class, IDaInstituicao
    {
        mb.Entity<T>().HasQueryFilter(e => e.InstituicaoId == InstituicaoAtual);
        mb.Entity<T>().HasOne<Instituicao>().WithMany().HasForeignKey(e => e.InstituicaoId).OnDelete(DeleteBehavior.Restrict);
    }

    public static string Snake(string nome) => Regex.Replace(nome, "([a-z0-9])([A-Z])", "$1_$2").ToLowerInvariant();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        CarimbarInstituicao();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        CarimbarInstituicao();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    void CarimbarInstituicao()
    {
        foreach (var e in ChangeTracker.Entries<IDaInstituicao>().Where(e => e.State == EntityState.Added))
        {
            if (InstituicaoAtual is null)
                throw new InvalidOperationException("Gravação sem instituição na sessão.");
            if (e.Entity.InstituicaoId == 0)
                e.Entity.InstituicaoId = InstituicaoAtual.Value;
            else if (e.Entity.InstituicaoId != InstituicaoAtual)
                throw new InvalidOperationException("Entidade de outra instituição.");
        }
    }
}

public class OneDbDesignTime : IDesignTimeDbContextFactory<OneDb>
{
    public OneDb CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<OneDb>().UseNpgsql("Host=localhost;Database=one;Username=postgres;Password=postgres", o => o.UseVector()).Options);
}
