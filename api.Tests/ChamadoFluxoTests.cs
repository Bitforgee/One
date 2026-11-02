using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Tests.Infra;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Tests;

public class ChamadoFluxoTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Assumir_aberto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        var r = await b.A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal(EmAtendimento, c.Estado);
        Assert.Equal(b.A.Usuario.Id, c.ResponsavelId);
    }

    [Fact]
    public async Task Primeira_resposta_publica_assume()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        var r = await Balcao.Mensagem(b.A.Cliente, numero, "Olá, vou verificar.");

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal(EmAtendimento, c.Estado);
        Assert.Equal(b.A.Usuario.Id, c.ResponsavelId);
    }

    [Fact]
    public async Task Assumir_de_outro_troca_e_registra()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);

        var r = await b.B.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(b.B.Usuario.Id, (await b.Ler(numero)).ResponsavelId);
        var evento = (await b.Eventos(numero)).Last(e => e.Tipo == "ATRIBUICAO");
        Assert.Equal((b.A.Usuario.Nome, b.B.Usuario.Nome, b.B.Usuario.Id), (evento.De, evento.Para, evento.AtorId));
    }

    [Fact]
    public async Task Aguardando_aluno()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);

        var r = await Balcao.Mensagem(b.A.Cliente, numero, "Envie o comprovante.", aguardaAluno: true);

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.Equal(AguardandoAluno, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Resposta_do_aluno_volta_em_atendimento()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(AguardandoAluno);

        var r = await Balcao.Mensagem(b.ClienteAluno, numero, "Segue o comprovante.");

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.Equal(EmAtendimento, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Resolver_com_texto()
    {
        var b = await Balcao.Criar(f);
        foreach (var texto in new[] { "x", new string('r', 4000) })
        {
            var numero = await b.Chamado(EmAtendimento);

            var r = await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/resolver", new { texto });

            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
            Assert.Equal(Resolvido, (await b.Ler(numero)).Estado);
            var aluno = await b.Detalhe(b.ClienteAluno, numero);
            Assert.Contains(aluno.GetProperty("mensagens").EnumerateArray(), m => m.GetProperty("texto").GetString() == texto && m.GetProperty("tipo").GetString() == "PUBLICA");
        }
    }

    [Fact]
    public async Task Resolver_sem_texto_ou_4001_400()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(EmAtendimento);

        foreach (var corpo in new object[] { new { }, new { texto = "" }, new { texto = "  " }, new { texto = new string('r', 4001) } })
            Assert.Equal(HttpStatusCode.BadRequest, (await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/resolver", corpo)).StatusCode);

        Assert.Equal(EmAtendimento, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Confirmar_fecha()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);

        var r = await b.ClienteAluno.PostAsync($"/api/chamados/{numero}/confirmar", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal((Fechado, "CONFIRMADO"), (c.Estado, c.MotivoFechamento));
    }

    [Fact]
    public async Task Rejeitar_ate_7_dias()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7));

        var r = await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "O boleto continua errado." });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal((EmAtendimento, 1, b.A.Usuario.Id), (c.Estado, c.Reaberturas, c.ResponsavelId));
    }

    [Fact]
    public async Task Rejeitar_sem_motivo_400()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);

        foreach (var corpo in new object[] { new { }, new { motivo = " " } })
            Assert.Equal(HttpStatusCode.BadRequest, (await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", corpo)).StatusCode);

        Assert.Equal(Resolvido, (await b.Ler(numero)).Estado);
    }

    [Fact]
    public async Task Rejeitar_depois_de_7_dias_409()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await b.Recuar(numero, TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));

        var r = await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "Ainda errado." });

        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal((Resolvido, 0), (c.Estado, c.Reaberturas));
    }

    [Fact]
    public async Task Mensagem_do_aluno_em_resolvido_rejeita()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);

        var r = await Balcao.Mensagem(b.ClienteAluno, numero, "Não funcionou.");

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal((EmAtendimento, 1), (c.Estado, c.Reaberturas));
        var motivo = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.Where(m => m.ChamadoId == c.Id).OrderBy(m => m.Id).LastAsync());
        Assert.Equal(("Não funcionou.", b.Aluno.Usuario.Id), (motivo.Texto, motivo.AutorId));

        var tarde = await b.Chamado(Resolvido);
        await b.Recuar(tarde, TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));
        Assert.Equal(HttpStatusCode.Conflict, (await Balcao.Mensagem(b.ClienteAluno, tarde, "Ainda não.")).StatusCode);
        Assert.Equal(Resolvido, (await b.Ler(tarde)).Estado);
    }

    [Fact]
    public async Task Rejeicao_sem_responsavel_ativo_volta_aberto()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Resolvido);
        await f.Db(b.Instituicao.Id, db => db.Usuarios.Where(u => u.Id == b.A.Usuario.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Ativo, false)));

        var r = await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/rejeitar", new { motivo = "Ainda errado." });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var c = await b.Ler(numero);
        Assert.Equal((Aberto, (long?)null, b.Triagem.Id), (c.Estado, c.ResponsavelId, c.SetorId));
    }

    [Fact]
    public async Task Cancelar_nos_3_estados()
    {
        var b = await Balcao.Criar(f);
        foreach (var estado in new[] { Aberto, EmAtendimento, AguardandoAluno })
        {
            var numero = await b.Chamado(estado);

            var r = await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{numero}/cancelar", new { motivo = "Resolvi sozinho." });

            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
            var c = await b.Ler(numero);
            Assert.Equal((Fechado, "CANCELADO"), (c.Estado, c.MotivoFechamento));
            Assert.Equal("Resolvi sozinho.", (await b.Eventos(numero)).Last().Detalhe);
        }
        var semMotivo = await b.Chamado();
        Assert.Equal(HttpStatusCode.OK, (await b.ClienteAluno.PostAsJsonAsync($"/api/chamados/{semMotivo}/cancelar", new { })).StatusCode);
    }

    [Fact]
    public async Task Mensagem_em_fechado_409()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado(Fechado);
        var antes = await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync());

        Assert.Equal(HttpStatusCode.Conflict, (await Balcao.Mensagem(b.A.Cliente, numero, "Mais uma coisa", "NOTA")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Balcao.Mensagem(b.ClienteAluno, numero, "Mais uma coisa")).StatusCode);
        Assert.Equal(antes, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync()));
    }

    [Fact]
    public async Task Mensagem_sem_texto_400()
    {
        var b = await Balcao.Criar(f);
        var numero = await b.Chamado();

        Assert.Equal(HttpStatusCode.BadRequest, (await Balcao.Mensagem(b.ClienteAluno, numero, "")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Balcao.Mensagem(b.A.Cliente, numero, "   ")).StatusCode);
        Assert.Equal(0, await f.Db(b.Instituicao.Id, db => db.MensagensChamado.CountAsync()));
        Assert.Equal(Aberto, (await b.Ler(numero)).Estado);
    }
}

public class FilaTests(OneFactory f) : IClassFixture<OneFactory>
{
    [Fact]
    public async Task Fila_do_setor_mais_antigo_primeiro()
    {
        var b = await Balcao.Criar(f);
        var antigo = await b.Chamado(descricao: "primeiro");
        await b.Recuar(antigo, TimeSpan.FromDays(2) + TimeSpan.FromHours(1));
        var meio = await b.Chamado(EmAtendimento, "segundo");
        await b.Recuar(meio, TimeSpan.FromHours(1));
        var fechado = await b.Chamado(Fechado, "terceiro");
        // chamado de outro setor
        await b.A.Cliente.PostAsJsonAsync($"/api/chamados/{await b.Chamado(descricao: "quarto")}/encaminhar", new { setorId = b.Outro.Id, motivo = "É do financeiro." });

        var r = await b.B.Cliente.GetAsync("/api/chamados?escopo=fila");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var fila = (await r.Json()).EnumerateArray().ToList();
        Assert.Equal([antigo, meio], fila.Select(c => c.GetProperty("numero").GetString()));
        Assert.Equal(("primeiro", "Não classificado", "ABERTO", 2), (fila[0].GetProperty("titulo").GetString(), fila[0].GetProperty("categoria").GetString(), fila[0].GetProperty("estado").GetString(), fila[0].GetProperty("dias").GetInt32()));
        Assert.Equal(System.Text.Json.JsonValueKind.Null, fila[0].GetProperty("responsavel").ValueKind);
        Assert.Equal((b.A.Usuario.Nome, 0), (fila[1].GetProperty("responsavel").GetString(), fila[1].GetProperty("dias").GetInt32()));
        Assert.DoesNotContain(fechado, fila.Select(c => c.GetProperty("numero").GetString()));
    }

    [Fact]
    public async Task Minhas_solicitacoes_so_do_aluno_mais_recente_primeiro()
    {
        var b = await Balcao.Criar(f);
        var primeiro = await b.Chamado(descricao: "primeiro");
        await b.Recuar(primeiro, TimeSpan.FromMinutes(5));
        var segundo = await b.Chamado(Fechado, "segundo");
        var outro = await f.AlunoLogado(b.Instituicao);
        await outro.Cliente.PostAsJsonAsync("/api/atendimento-direto", new { descricao = "de outro aluno" });

        var r = await b.ClienteAluno.GetAsync("/api/chamados?escopo=meus");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var meus = (await r.Json()).EnumerateArray().ToList();
        Assert.Equal([segundo, primeiro], meus.Select(c => c.GetProperty("numero").GetString()));
        Assert.Equal(["segundo", "primeiro"], meus.Select(c => c.GetProperty("titulo").GetString()));
        Assert.Equal(["FECHADO", "ABERTO"], meus.Select(c => c.GetProperty("estado").GetString()));
    }
}
