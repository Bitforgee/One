using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace One.Api.Dados;

public class OneDb(DbContextOptions<OneDb> options) : DbContext(options)
{
    // Instituição da sessão; o filtro global e o SaveChanges usam este valor (door 16).
    public long? InstituicaoAtual { get; set; }

    public DbSet<Instituicao> Instituicoes => Set<Instituicao>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<UsuarioPapel> UsuarioPapeis => Set<UsuarioPapel>();
    public DbSet<Setor> Setores => Set<Setor>();
    public DbSet<AtendenteSetor> AtendenteSetores => Set<AtendenteSetor>();
    public DbSet<Curso> Cursos => Set<Curso>();
    public DbSet<Matricula> Matriculas => Set<Matricula>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<RegraRoteamento> Regras => Set<RegraRoteamento>();
    public DbSet<Artigo> Artigos => Set<Artigo>();
    public DbSet<VersaoArtigo> VersoesArtigo => Set<VersaoArtigo>();
    public DbSet<TokenAcesso> Tokens => Set<TokenAcesso>();
    public DbSet<Conversa> Conversas => Set<Conversa>();
    public DbSet<MensagemConversa> MensagensConversa => Set<MensagemConversa>();
    public DbSet<CitacaoArtigo> Citacoes => Set<CitacaoArtigo>();
    public DbSet<Chamado> Chamados => Set<Chamado>();
    public DbSet<MensagemChamado> MensagensChamado => Set<MensagemChamado>();
    public DbSet<Anexo> Anexos => Set<Anexo>();
    public DbSet<EventoChamado> EventosChamado => Set<EventoChamado>();
    public DbSet<RespostaPronta> RespostasProntas => Set<RespostaPronta>();
    public DbSet<EmailSaida> EmailsSaida => Set<EmailSaida>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Instituicao>(e =>
        {
            e.Property(x => x.Slug).HasMaxLength(30);
            e.HasIndex(x => x.Slug).IsUnique();
        });
        mb.Entity<Usuario>(e =>
        {
            e.Property(x => x.Cpf).HasColumnType("char(11)");
            e.HasIndex(x => new { x.InstituicaoId, x.Cpf }).IsUnique();
            e.HasIndex(x => new { x.InstituicaoId, x.Email }).IsUnique();
        });
        mb.Entity<UsuarioPapel>().HasIndex(x => new { x.UsuarioId, x.Papel }).IsUnique();
        mb.Entity<Setor>(e =>
        {
            e.HasIndex(x => x.InstituicaoId).IsUnique().HasFilter("triagem").HasDatabaseName("ux_setor_triagem");
            e.HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
        });
        mb.Entity<Categoria>().HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
        mb.Entity<AtendenteSetor>(e =>
        {
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
        });
        mb.Entity<Curso>(e =>
        {
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorCoordenacaoId);
            e.HasIndex(x => new { x.InstituicaoId, x.Nome }).IsUnique();
        });
        mb.Entity<Matricula>(e =>
        {
            e.Property(x => x.Numero).HasMaxLength(20);
            e.HasIndex(x => new { x.InstituicaoId, x.Numero }).IsUnique();
        });
        mb.Entity<RegraRoteamento>(e =>
        {
            e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
            e.HasIndex(x => x.CategoriaId).IsUnique();
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
        });
        mb.Entity<Artigo>().HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
        mb.Entity<VersaoArtigo>().HasIndex(x => new { x.ArtigoId, x.Numero }).IsUnique();
        mb.Entity<TokenAcesso>(e =>
        {
            e.Property(x => x.Hash).HasColumnType("char(64)");
            e.HasIndex(x => x.Hash).IsUnique();
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId);
        });
        mb.Entity<Conversa>().HasOne<Usuario>().WithMany().HasForeignKey(x => x.AlunoId);
        mb.Entity<CitacaoArtigo>().HasOne<VersaoArtigo>().WithMany().HasForeignKey(x => x.VersaoArtigoId);
        mb.Entity<Chamado>(e =>
        {
            e.Property(x => x.Numero).HasMaxLength(20);
            e.HasIndex(x => new { x.InstituicaoId, x.Numero }).IsUnique();
            e.HasOne<Conversa>().WithOne().HasForeignKey<Chamado>(x => x.ConversaId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.SolicitanteId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.ResponsavelId);
            e.HasOne<Matricula>().WithMany().HasForeignKey(x => x.MatriculaId);
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
            e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaId);
            e.HasOne<Categoria>().WithMany().HasForeignKey(x => x.CategoriaOriginalId);
            e.Property(x => x.Titulo).HasMaxLength(120);
            e.Property(x => x.Resumo).HasMaxLength(500);
            e.Property(x => x.Xmin).IsRowVersion();
        });
        mb.Entity<MensagemChamado>(e =>
        {
            e.HasOne<Chamado>().WithMany().HasForeignKey(x => x.ChamadoId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.AutorId);
        });
        mb.Entity<Anexo>().HasOne<MensagemChamado>().WithMany(m => m.Anexos).HasForeignKey(x => x.MensagemChamadoId);
        mb.Entity<EventoChamado>(e =>
        {
            e.HasOne<Chamado>().WithMany().HasForeignKey(x => x.ChamadoId);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.AtorId);
        });
        mb.Entity<RespostaPronta>(e =>
        {
            e.HasOne<Setor>().WithMany().HasForeignKey(x => x.SetorId);
            e.HasIndex(x => new { x.SetorId, x.Titulo }).IsUnique();
        });

        var configurar = GetType().GetMethod(nameof(DaInstituicao), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        foreach (var tipo in mb.Model.GetEntityTypes().Select(e => e.ClrType).Where(t => typeof(IDaInstituicao).IsAssignableFrom(t)).ToList())
            configurar.MakeGenericMethod(tipo).Invoke(this, [mb]);

        foreach (var e in mb.Model.GetEntityTypes())
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
        new(new DbContextOptionsBuilder<OneDb>().UseNpgsql("Host=localhost;Database=one;Username=postgres;Password=postgres").Options);
}
