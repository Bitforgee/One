using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Tests.Infra;

public record Atendente(Usuario Usuario, HttpClient Cliente);

// Instituição com um aluno, dois atendentes da triagem (A e B) e um atendente de outro setor (Alheio).
public record Balcao(OneFactory F, Instituicao Instituicao, Aluno Aluno, Setor Triagem, Setor Outro, Atendente A, Atendente B, Atendente Alheio)
{
    public HttpClient ClienteAluno => Aluno.Cliente;

    public static async Task<Balcao> Criar(OneFactory f, Instituicao? i = null)
    {
        i ??= await f.Instituicao(nome: "Univag");
        var triagem = await f.Db(i.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var outro = await f.Setor(i, "Financeiro");
        return new Balcao(f, i, await f.AlunoLogado(i), triagem, outro,
            await f.Atendente(i, triagem), await f.Atendente(i, triagem), await f.Atendente(i, outro));
    }

    // Chamado na triagem por atendimento direto, levado ao estado pedido pelo atendente A e pelo aluno.
    public async Task<string> Chamado(string estado = EstadosChamado.Aberto, string descricao = "Preciso de ajuda com o boleto")
    {
        var r = await ClienteAluno.PostAsJsonAsync("/api/atendimento-direto", new { descricao });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var numero = (await r.Json()).GetProperty("numero").GetString()!;
        if (estado == EstadosChamado.Aberto) return numero;
        Ok(await A.Cliente.PostAsync($"/api/chamados/{numero}/assumir", null));
        if (estado == EstadosChamado.AguardandoAluno) Ok(await Mensagem(A.Cliente, numero, "Envie o comprovante, por favor.", aguardaAluno: true));
        if (estado is EstadosChamado.Resolvido or EstadosChamado.Fechado) Ok(await A.Cliente.PostAsJsonAsync($"/api/chamados/{numero}/resolver", new { texto = "Boleto reemitido." }));
        if (estado == EstadosChamado.Fechado) Ok(await ClienteAluno.PostAsync($"/api/chamados/{numero}/confirmar", null));
        Assert.Equal(estado, (await Ler(numero)).Estado);
        return numero;
    }

    static void Ok(HttpResponseMessage r) => Assert.True(r.IsSuccessStatusCode, $"{r.RequestMessage?.RequestUri}: {(int)r.StatusCode}");

    public static Task<HttpResponseMessage> Mensagem(HttpClient c, string numero, string texto, string tipo = "PUBLICA", bool aguardaAluno = false) =>
        c.PostAsync($"/api/chamados/{numero}/mensagens", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["tipo"] = tipo,
            ["texto"] = texto,
            ["aguardaAluno"] = aguardaAluno ? "true" : "false",
        }));

    // Volta no tempo só o chamado: avançar o relógio 7 dias venceria também o cookie de 8 h das sessões.
    public Task Recuar(string numero, TimeSpan quanto) =>
        F.Db(Instituicao.Id, db => db.Chamados.Where(c => c.Numero == numero).ExecuteUpdateAsync(s => s
            .SetProperty(c => c.CriadoEm, c => c.CriadoEm - quanto)
            .SetProperty(c => c.ResolvidoEm, c => c.ResolvidoEm - quanto)));

    public Task<Chamado> Ler(string numero) => F.Db(Instituicao.Id, db => db.Chamados.SingleAsync(c => c.Numero == numero));

    public Task<List<EventoChamado>> Eventos(string numero) =>
        F.Db(Instituicao.Id, db => db.EventosChamado.Where(e => db.Chamados.Any(c => c.Id == e.ChamadoId && c.Numero == numero)).OrderBy(e => e.Id).ToListAsync());

    public async Task<JsonElement> Detalhe(HttpClient c, string numero) => await (await c.GetAsync($"/api/chamados/{numero}")).Json();
}

public static class SementeAtendimento
{
    public static Task<Setor> Setor(this OneFactory f, Instituicao i, string nome) =>
        f.Db(i.Id, async db =>
        {
            var s = new Setor { Nome = nome };
            db.Setores.Add(s);
            await db.SaveChangesAsync();
            return s;
        });

    public static async Task<Atendente> Atendente(this OneFactory f, Instituicao i, params Setor[] setores)
    {
        var u = await f.Usuario(i, [Papeis.Atendente]);
        await f.Db(i.Id, async db =>
        {
            db.AtendenteSetores.AddRange(setores.Select(s => new AtendenteSetor { UsuarioId = u.Id, SetorId = s.Id }));
            await db.SaveChangesAsync();
        });
        return new Atendente(u, await f.Entrar(i, u));
    }

    public static Task<RegraRoteamento> Regra(this OneFactory f, Instituicao i, Categoria c, Setor? setor) =>
        f.Db(i.Id, async db =>
        {
            var r = new RegraRoteamento { CategoriaId = c.Id, Destino = setor is null ? "COORDENACAO_CURSO" : "SETOR", SetorId = setor?.Id };
            db.Regras.Add(r);
            await db.SaveChangesAsync();
            return r;
        });
}
