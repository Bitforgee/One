using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Administracao;

public sealed record ImportarMatriculas(IFormCollection Form) : IRequest<IResult>
{
    public sealed record Resposta(int Criados, int Atualizados);

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
        return Results.Ok(new ImportarMatriculas.Resposta(criados, atualizados));
    }

    record DonoDaMatricula(string Numero, Cpf Cpf);

    async Task<(Dictionary<string, string>, Dictionary<string, string>)> Donos(List<LinhaCsv> linhas)
    {
        var numeros = linhas.Select(l => l.Matricula).ToList();
        var emails = linhas.Select(l => l.Email).ToList();
        var matriculas = await db.Matriculas.Where(m => numeros.Contains(m.Numero))
            .Select(m => new DonoDaMatricula(m.Numero, db.Usuarios.Where(u => u.Id == m.UsuarioId).Select(u => u.Cpf).Single())).ToDictionaryAsync(m => m.Numero, m => m.Cpf.Valor);
        return (matriculas, await db.Usuarios.Where(u => emails.Contains(u.Email)).ToDictionaryAsync(u => u.Email, u => u.Cpf.Valor));
    }

    async Task<(int, int)> Gravar(List<Linha> validas, List<LinhaCsv> linhas)
    {
        var cpfs = linhas.Select(l => Cpf.Tentar(l.Cpf)).OfType<Cpf>().ToList();
        var numeros = linhas.Select(l => l.Matricula).ToList();
        var alunos = await db.Usuarios.Include(u => u.Papeis).Where(u => cpfs.Contains(u.Cpf)).ToDictionaryAsync(u => u.Cpf.Valor);
        var matriculas = await db.Matriculas.Where(m => numeros.Contains(m.Numero)).ToDictionaryAsync(m => m.Numero);
        var (criados, atualizados) = (0, 0);
        foreach (var l in validas)
        {
            if (!alunos.TryGetValue(l.Cpf, out var u)) alunos[l.Cpf] = u = db.Usuarios.Add(Usuario.Criar(Cpf.Ler(l.Cpf), l.Nome, l.Email)).Entity;
            u.AlterarContato(l.Nome, l.Email);
            u.AdicionarPapel(Papeis.Aluno);
            if (matriculas.TryGetValue(l.Matricula, out var m)) atualizados++;
            else
            {
                matriculas[l.Matricula] = u.AdicionarMatricula(l.Matricula, l.CursoId, l.Semestre, l.Situacao);
                criados++;
            }
            m?.Atualizar(l.CursoId, l.Semestre, l.Situacao);
        }
        await db.SaveChangesAsync();
        return (criados, atualizados);
    }

    static IResult Erros(List<ErroCsv> erros) =>
        Results.Problem(detail: "O arquivo tem linhas inválidas; nenhuma linha foi importada.", statusCode: 400, title: Problemas.Titulo(400),
            extensions: new Dictionary<string, object?> { ["erros"] = erros });
}
