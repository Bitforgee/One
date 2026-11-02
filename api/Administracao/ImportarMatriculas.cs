using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

// door 15 e AC 105 a 107: tudo ou nada; atualiza alunos pelo CPF e matrículas pelo número, dentro da instituição.
public sealed record ImportarMatriculas(IFormCollection Form) : IRequest<IResult>
{
    public static void Mapear(RouteGroupBuilder g) =>
        g.MapPost("/matriculas/importacao", async (HttpRequest req, IMediator m) =>
            await m.Send(new ImportarMatriculas(req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty)));
}

public sealed class ImportarMatriculasHandler(OneDb db) : IRequestHandler<ImportarMatriculas, IResult>
{
    public async ValueTask<IResult> Handle(ImportarMatriculas m, CancellationToken ct)
    {
        var arquivo = m.Form.Files["arquivo"] ?? m.Form.Files.FirstOrDefault();
        if (arquivo is null) return Problemas.Invalido("Envie o arquivo CSV no campo arquivo.", "arquivo");
        string texto;
        using (var leitor = new StreamReader(arquivo.OpenReadStream(), System.Text.Encoding.UTF8)) texto = await leitor.ReadToEndAsync();

        var (linhas, cabecalho) = CsvMatriculas.Separar(texto);
        if (cabecalho is not null) return Erros([cabecalho]);
        var (donoDaMatricula, donoDoEmail) = await Donos(linhas);
        var (validas, erros) = CsvMatriculas.Validar(linhas, await db.Cursos.ToDictionaryAsync(c => c.Nome, c => c.Id), donoDaMatricula, donoDoEmail);
        if (erros.Count > 0) return Erros(erros);

        var (criados, atualizados) = await Gravar(validas, linhas);
        return Results.Ok(new { criados, atualizados });
    }

    static string Campo(LinhaCsv l, int i) => l.Campos.ElementAtOrDefault(i) ?? "";

    // CPF que já usa cada matrícula e cada e-mail do arquivo na instituição.
    async Task<(Dictionary<string, string>, Dictionary<string, string>)> Donos(List<LinhaCsv> linhas)
    {
        var numeros = linhas.Select(l => Campo(l, 3)).ToList();
        var emails = linhas.Select(l => Campo(l, 2)).ToList();
        var matriculas = await db.Matriculas.Where(m => numeros.Contains(m.Numero))
            .Select(m => new { m.Numero, Cpf = db.Usuarios.Where(u => u.Id == m.UsuarioId).Select(u => u.Cpf).Single() }).ToDictionaryAsync(m => m.Numero, m => m.Cpf);
        return (matriculas, await db.Usuarios.Where(u => emails.Contains(u.Email)).ToDictionaryAsync(u => u.Email, u => u.Cpf));
    }

    async Task<(int, int)> Gravar(List<Linha> validas, List<LinhaCsv> linhas)
    {
        var cpfs = linhas.Select(l => Cpf.Normalizar(Campo(l, 0)) ?? "").ToList();
        var numeros = linhas.Select(l => Campo(l, 3)).ToList();
        var alunos = await db.Usuarios.Include(u => u.Papeis).Where(u => cpfs.Contains(u.Cpf)).ToDictionaryAsync(u => u.Cpf);
        var matriculas = await db.Matriculas.Where(m => numeros.Contains(m.Numero)).ToDictionaryAsync(m => m.Numero);
        var (criados, atualizados) = (0, 0);
        foreach (var l in validas)
        {
            if (!alunos.TryGetValue(l.Cpf, out var u)) alunos[l.Cpf] = u = db.Usuarios.Add(new Usuario { Cpf = l.Cpf }).Entity; // sem senha: entra pelo primeiro acesso
            u.Nome = l.Nome;
            u.Email = l.Email;
            if (!u.Tem(Papeis.Aluno)) u.Papeis.Add(new UsuarioPapel { Papel = Papeis.Aluno });
            if (matriculas.TryGetValue(l.Matricula, out var m)) atualizados++;
            else
            {
                matriculas[l.Matricula] = m = new Matricula { Numero = l.Matricula };
                u.Matriculas.Add(m);
                criados++;
            }
            (m.CursoId, m.Semestre, m.Situacao) = (l.CursoId, l.Semestre, l.Situacao);
        }
        await db.SaveChangesAsync();
        return (criados, atualizados);
    }

    static IResult Erros(List<ErroCsv> erros) =>
        Results.Problem(detail: "O arquivo tem linhas inválidas; nenhuma linha foi importada.", statusCode: 400, title: Problemas.Titulo(400),
            extensions: new Dictionary<string, object?> { ["erros"] = erros.Select(e => new { linha = e.Linha, motivo = e.Motivo }).ToList() });
}
