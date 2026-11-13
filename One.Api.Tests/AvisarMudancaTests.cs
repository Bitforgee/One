using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using One.Api.Chamados;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public record Envio(string Grupo, string Metodo, object?[] Argumentos);

public sealed class HubGravador : IHubContext<TempoRealHub>
{
    public List<Envio> Envios { get; } = [];
    public bool Falhar { get; set; }
    public IHubClients Clients { get; }
    public IGroupManager Groups => throw new NotSupportedException();

    public HubGravador() => Clients = new Clientes(this);

    public List<Envio> Tirar()
    {
        lock (Envios)
        {
            var lista = Envios.ToList();
            Envios.Clear();
            return lista;
        }
    }

    sealed class Clientes(HubGravador dono) : IHubClients
    {
        public IClientProxy Group(string grupo) => new Proxy(dono, grupo);
        public IClientProxy All => throw new NotSupportedException();
        public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
        public IClientProxy Client(string connectionId) => throw new NotSupportedException();
        public IClientProxy Clients(IReadOnlyList<string> connectionIds) => throw new NotSupportedException();
        public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
        public IClientProxy Groups(IReadOnlyList<string> groupNames) => throw new NotSupportedException();
        public IClientProxy User(string userId) => throw new NotSupportedException();
        public IClientProxy Users(IReadOnlyList<string> userIds) => throw new NotSupportedException();
    }

    sealed class Proxy(HubGravador dono, string grupo) : IClientProxy
    {
        public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
        {
            if (dono.Falhar) throw new InvalidOperationException("hub fora");
            lock (dono.Envios) dono.Envios.Add(new Envio(grupo, method, args));
            return Task.CompletedTask;
        }
    }
}

public class OneFactoryComGravador : OneFactory
{
    public HubGravador Hub { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureTestServices(s =>
        {
            s.RemoveAll<IHubContext<TempoRealHub>>();
            s.AddSingleton<IHubContext<TempoRealHub>>(Hub);
        });
    }
}

public class AvisarMudancaTests(OneFactoryComGravador f) : IClassFixture<OneFactoryComGravador>
{
    static readonly DateTime Agora = new(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);

    static Envio[] Par(long instituicaoId, string numero, params long[] setores) =>
    [
        new(TempoRealGrupos.Chamado(instituicaoId, numero), "ChamadoMudou", [numero]),
        .. setores.Select(s => new Envio(TempoRealGrupos.Fila(instituicaoId, s), "FilaMudou", [])),
    ];

    static void Igual(IEnumerable<Envio> esperado, IEnumerable<Envio> real)
    {
        static string Texto(Envio e) => $"{e.Grupo}|{e.Metodo}|{string.Join(",", e.Argumentos)}";
        Assert.Equal(esperado.Select(Texto).Order(), real.Select(Texto).Order());
    }

    Task<Chamado> Carregar(OneDb db, string numero) => db.Chamados.SingleAsync(c => c.Numero == numero);

    [Fact]
    public async Task Gravacoes_de_Chamado_Mensagem_e_Evento_avisam()
    {
        var b = await Balcao.Criar(f);
        f.Hub.Tirar();

        var numero = await b.Chamado();
        Igual(Par(b.Instituicao.Id, numero, b.Triagem.Id), f.Hub.Tirar());

        await f.Db(b.Instituicao.Id, async db =>
        {
            (await Carregar(db, numero)).Assumir(b.A.Usuario.Id, null, "Atendente", Agora);
            await db.SaveChangesAsync();
        });
        Igual(Par(b.Instituicao.Id, numero, b.Triagem.Id), f.Hub.Tirar());

        var id = (await b.Ler(numero)).Id;
        await f.Db(b.Instituicao.Id, async db =>
        {
            db.MensagensChamado.Add(new MensagemChamado { ChamadoId = id, Tipo = TiposMensagem.Publica, Texto = "oi", CriadaEm = Agora });
            await db.SaveChangesAsync();
        });
        Igual(Par(b.Instituicao.Id, numero, b.Triagem.Id), f.Hub.Tirar());

        await f.Db(b.Instituicao.Id, async db =>
        {
            db.EventosChamado.Add(new EventoChamado { ChamadoId = id, Tipo = TiposEvento.Lembrete, CriadoEm = Agora });
            await db.SaveChangesAsync();
        });
        Igual(Par(b.Instituicao.Id, numero, b.Triagem.Id), f.Hub.Tirar());
    }

    [Fact]
    public async Task Gravacoes_de_Usuario_Artigo_e_Conversa_nao_avisam()
    {
        var b = await Balcao.Criar(f);
        f.Hub.Tirar();

        await f.Db(b.Instituicao.Id, async db =>
        {
            var aluno = await db.Usuarios.SingleAsync(u => u.Id == b.Aluno.Usuario.Id);
            aluno.AlterarContato("Outro nome", aluno.Email);
            await db.SaveChangesAsync();
        });
        Assert.Empty(f.Hub.Tirar());

        await f.Artigo(b.Instituicao, "Boleto", "O boleto fica no portal.");
        Assert.Empty(f.Hub.Tirar());

        await f.Db(b.Instituicao.Id, async db =>
        {
            db.Conversas.Add(One.Api.Dados.Conversas.Conversa.Iniciar(b.Aluno.Usuario.Id, Agora));
            await db.SaveChangesAsync();
        });
        Assert.Empty(f.Hub.Tirar());
    }

    [Fact]
    public async Task Varias_entidades_do_mesmo_chamado_avisam_uma_vez()
    {
        var b = await Balcao.Criar(f);
        var (n1, n2) = (await b.Chamado(), await b.Chamado());
        var (id1, id2) = ((await b.Ler(n1)).Id, (await b.Ler(n2)).Id);
        f.Hub.Tirar();

        await f.Db(b.Instituicao.Id, async db =>
        {
            (await Carregar(db, n1)).Assumir(b.A.Usuario.Id, null, "Atendente", Agora);
            db.MensagensChamado.Add(new MensagemChamado { ChamadoId = id1, Tipo = TiposMensagem.Publica, Texto = "oi", CriadaEm = Agora });
            db.EventosChamado.Add(new EventoChamado { ChamadoId = id1, Tipo = TiposEvento.Lembrete, CriadoEm = Agora });
            await db.SaveChangesAsync();
        });
        Igual(Par(b.Instituicao.Id, n1, b.Triagem.Id), f.Hub.Tirar());

        await f.Db(b.Instituicao.Id, async db =>
        {
            db.EventosChamado.Add(new EventoChamado { ChamadoId = id1, Tipo = TiposEvento.Lembrete, CriadoEm = Agora });
            db.EventosChamado.Add(new EventoChamado { ChamadoId = id2, Tipo = TiposEvento.Lembrete, CriadoEm = Agora });
            await db.SaveChangesAsync();
        });
        Igual([.. Par(b.Instituicao.Id, n1, b.Triagem.Id), .. Par(b.Instituicao.Id, n2, b.Triagem.Id)], f.Hub.Tirar());
    }

    [Fact]
    public async Task Aviso_espera_o_commit_da_transacao()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        f.Hub.Tirar();

        await f.Db(b.Instituicao.Id, async db =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            (await Carregar(db, numero)).Assumir(b.A.Usuario.Id, null, "Atendente", Agora);
            await db.SaveChangesAsync();
            Assert.Empty(f.Hub.Tirar());
            await tx.CommitAsync();
        });
        Igual(Par(b.Instituicao.Id, numero, b.Triagem.Id), f.Hub.Tirar());
    }

    [Fact]
    public async Task Gravacao_que_falha_nao_avisa()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        f.Hub.Tirar();

        using var escopo1 = f.Services.CreateScope();
        using var escopo2 = f.Services.CreateScope();
        var (db1, db2) = (escopo1.ServiceProvider.GetRequiredService<OneDb>(), escopo2.ServiceProvider.GetRequiredService<OneDb>());
        db1.InstituicaoAtual = db2.InstituicaoAtual = b.Instituicao.Id;
        (await Carregar(db1, numero)).Assumir(b.A.Usuario.Id, null, "A", Agora);
        (await Carregar(db2, numero)).Assumir(b.B.Usuario.Id, null, "B", Agora);
        await db1.SaveChangesAsync();
        Assert.Equal(2, f.Hub.Tirar().Count);

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => db2.SaveChangesAsync());
        Assert.Empty(f.Hub.Tirar());
    }

    [Fact]
    public async Task Transacao_desfeita_nao_avisa()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        f.Hub.Tirar();

        await f.Db(b.Instituicao.Id, async db =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            (await Carregar(db, numero)).Assumir(b.A.Usuario.Id, null, "Atendente", Agora);
            await db.SaveChangesAsync();
            await tx.RollbackAsync();
        });
        Assert.Empty(f.Hub.Tirar());
        Assert.Equal(EstadosChamado.Aberto, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Falha_no_envio_registra_aviso_com_ids_e_sem_texto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        var chamadoId = (await b.Ler(numero)).Id;
        f.Hub.Tirar();
        var antes = f.Logs.Entradas.Count;
        f.Hub.Falhar = true;
        try
        {
            await f.Db(b.Instituicao.Id, async db =>
            {
                db.MensagensChamado.Add(new MensagemChamado { ChamadoId = chamadoId, Tipo = TiposMensagem.Publica, Texto = "texto-secreto-da-mensagem", CriadaEm = Agora });
                await db.SaveChangesAsync();
            });
        }
        finally { f.Hub.Falhar = false; }

        var avisos = f.Logs.Entradas.Skip(antes).Where(l => l.Nivel == LogLevel.Warning && l.Categoria.EndsWith(nameof(AvisarMudanca))).ToList();
        var aviso = Assert.Single(avisos);
        Assert.Equal(chamadoId, aviso.Campos["ChamadoId"]);
        Assert.Equal(b.Instituicao.Id, aviso.Campos["InstituicaoId"]);
        Assert.DoesNotContain("texto-secreto-da-mensagem", string.Join("\n", f.Logs.Entradas.Skip(antes).Select(l => l.Mensagem)));
        Assert.Contains(await f.Db(b.Instituicao.Id, db => db.MensagensChamado.Select(m => m.Texto).ToListAsync()), t => t == "texto-secreto-da-mensagem");
    }

    [Fact]
    public async Task Setor_trocado_avisa_a_fila_antiga_e_a_nova()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        f.Hub.Tirar();

        await f.Db(b.Instituicao.Id, async db =>
        {
            (await Carregar(db, numero)).Encaminhar(b.A.Usuario.Id, b.Outro.Id, "Triagem", "Financeiro", "É do financeiro.", null, Agora);
            await db.SaveChangesAsync();
        });
        Igual(Par(b.Instituicao.Id, numero, b.Outro.Id, b.Triagem.Id), f.Hub.Tirar());
    }

    [Fact]
    public async Task ChamadoMudou_leva_so_o_numero_e_FilaMudou_nenhum_argumento()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();
        f.Hub.Tirar();

        await f.Db(b.Instituicao.Id, async db =>
        {
            (await Carregar(db, numero)).Assumir(b.A.Usuario.Id, null, "Atendente", Agora);
            await db.SaveChangesAsync();
        });
        var envios = f.Hub.Tirar();
        Assert.Equal([numero], Assert.Single(envios, e => e.Metodo == "ChamadoMudou").Argumentos);
        Assert.Empty(Assert.Single(envios, e => e.Metodo == "FilaMudou").Argumentos);
        Assert.Equal(2, envios.Count);
    }
}
