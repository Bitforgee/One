using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;
using One.Api.Tests.Infra;
using static One.Api.Tests.Infra.SementeAtendimento;

namespace One.Api.Tests;

// fluxos-atendimento S5 (C80 e C81): o detalhe do chamado diz por que ele caiu ali.
public class FluxoRastroTests(OneFactory f) : IClassFixture<OneFactory>
{
    // C80
    [Fact]
    public async Task Detalhe_traz_fluxo_e_abrangencia()
    {
        var c = await Cadeia.Criar(f); // categoria "Dúvida": fluxo para todos os cursos, 2 etapas
        var matricula = await f.Db(c.I.Id, db => db.Matriculas.SingleAsync(m => m.UsuarioId == c.Aluno.Usuario.Id));
        var curso = await f.Db(c.I.Id, db => db.Cursos.SingleAsync(x => x.Id == matricula.CursoId));
        var doCurso = await f.Categoria(c.I, "Do curso");
        var doSemestre = await f.Categoria(c.I, "Do semestre");
        await f.Fluxo(c.I, doCurso, curso.Id, null, Etapa(DestinosEtapa.Setor, c.Lideres.Id), Etapa(DestinosEtapa.Setor, c.Coordenacao.Id), Etapa(DestinosEtapa.Setor, c.Secretaria.Id));
        await f.Fluxo(c.I, doSemestre, curso.Id, matricula.Semestre, Etapa(DestinosEtapa.Setor, c.Lideres.Id), Etapa(DestinosEtapa.Setor, c.Coordenacao.Id));

        foreach (var (categoria, total, abrangencia) in new (Categoria, int, string)[]
        {
            (c.Duvida, 2, "Todos os cursos"),
            (doCurso, 3, curso.Nome),
            (doSemestre, 2, $"{curso.Nome}, {matricula.Semestre}º semestre"),
        })
        {
            var numero = await c.Transferir(categoria: categoria);

            var fluxo = (await c.Detalhe(c.A.Cliente, numero)).GetProperty("fluxo");

            Assert.Equal((1, 1, total, "SETOR", abrangencia),
                (fluxo.GetProperty("versao").GetInt32(), fluxo.GetProperty("etapa").GetInt32(), fluxo.GetProperty("total").GetInt32(),
                 fluxo.GetProperty("destino").GetString(), fluxo.GetProperty("abrangencia").GetString()));
        }
        // depois de subir, a etapa avança e a versão fica
        var subido = await c.Transferir();
        await c.Subir(c.A.Cliente, subido);
        var depois = (await c.Detalhe(c.B.Cliente, subido)).GetProperty("fluxo");
        Assert.Equal((1, 2), (depois.GetProperty("versao").GetInt32(), depois.GetProperty("etapa").GetInt32()));
    }

    // C81
    [Fact]
    public async Task Fora_de_fluxo_traz_null()
    {
        var c = await Cadeia.Criar(f);
        var triagem = await f.Db(c.I.Id, db => db.Setores.SingleAsync(s => s.Triagem));
        var daTriagem = await f.Atendente(c.I, triagem);
        var direto = await c.Direto();
        var encaminhado = await c.Transferir();
        await c.A.Cliente.PostAsJsonAsync($"/api/chamados/{encaminhado}/encaminhar", new { setorId = c.Secretaria.Id, motivo = "É da secretaria." });

        var doDireto = await c.Detalhe(daTriagem.Cliente, direto);
        var doEncaminhado = await c.Detalhe(c.C.Cliente, encaminhado);

        Assert.Equal(JsonValueKind.Null, doDireto.GetProperty("fluxo").ValueKind);
        Assert.Equal(JsonValueKind.Null, doEncaminhado.GetProperty("fluxo").ValueKind);
        Assert.Equal(JsonValueKind.Null, (await c.Detalhe(c.Aluno.Cliente, direto)).GetProperty("fluxo").ValueKind);
    }
}
