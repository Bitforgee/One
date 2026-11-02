using Microsoft.EntityFrameworkCore;
using One.Api.Acesso;
using One.Api.Conhecimento;
using One.Api.Dados;
using static One.Api.Dados.EstadosChamado;

namespace One.Api.Administracao;

public record UsuarioIn(string? Cpf, string? Nome, string? Email, string? SenhaTemporaria, string[]? Papeis, long[]? Setores);
public record SetorIn(string? Nome, bool? Triagem, bool? Ativo);
public record CategoriaIn(string? Nome, bool? Ativa);
public record CursoIn(string? Nome, long? SetorCoordenacaoId);
public record RegraIn(long? CategoriaId, string? Destino, long? SetorId);
public record RespostaProntaIn(long? SetorId, string? Titulo, string? Texto);

public static class AdminRotas
{
    static readonly string[] PapeisValidos = [Papeis.Aluno, Papeis.Atendente, Papeis.Administrador];

    static IResult NaoEncontrado() => Problemas.Erro(404, "Item não encontrado.");
    static IResult Repetido(string detalhe) => Problemas.Erro(409, detalhe);
    internal static bool Nome(string? n, int max = 100) => !string.IsNullOrWhiteSpace(n) && n.Length <= max;

    public static void Mapear(RouteGroupBuilder api)
    {
        // AC 104: todo /api/admin/* exige o papel administrador.
        var admin = api.MapGroup("/admin").AddEndpointFilter(async (c, next) =>
            c.HttpContext.Usuario().Tem(Papeis.Administrador) ? await next(c) : Problemas.Erro(403, "Só administradores podem usar esta área."));

        Usuarios(admin);
        ImportacaoRotas.Mapear(admin);

        Cadastro<Setor, SetorIn>(admin, "/setores",
            s => new { id = s.Id, nome = s.Nome, triagem = s.Triagem, ativo = s.Ativo },
            async (db, i, atual) =>
            {
                if (!Nome(i.Nome)) return Problemas.Invalido("Informe o nome do setor.", "nome");
                // AC 113: a instituição fica sempre com exatamente um setor de triagem
                var triagens = await db.Setores.CountAsync(s => s.Triagem && s.Id != (atual == null ? 0 : atual.Id)) + (i.Triagem == true ? 1 : 0);
                if (triagens != 1) return Problemas.Invalido("A instituição precisa de exatamente um setor de triagem.", "triagem");
                return await db.Setores.AnyAsync(s => s.Nome == i.Nome && s.Id != (atual == null ? 0 : atual.Id)) ? Repetido("Já existe um setor com este nome.") : null;
            },
            (s, i) => { s.Nome = i.Nome!; s.Triagem = i.Triagem == true; s.Ativo = i.Ativo ?? true; });

        Cadastro<Categoria, CategoriaIn>(admin, "/categorias",
            c => new { id = c.Id, nome = c.Nome, ativa = c.Ativa, padrao = c.Padrao },
            async (db, i, atual) =>
            {
                if (!Nome(i.Nome)) return Problemas.Invalido("Informe o nome da categoria.", "nome");
                if (atual is { Padrao: true } && (i.Nome != atual.Nome || i.Ativa == false))
                    return Problemas.Invalido("A categoria \"Não classificado\" não pode ser renomeada nem desativada.", "nome"); // AC 117
                return await db.Categorias.AnyAsync(c => c.Nome == i.Nome && c.Id != (atual == null ? 0 : atual.Id)) ? Repetido("Já existe uma categoria com este nome.") : null;
            },
            (c, i) => { c.Nome = i.Nome!; c.Ativa = i.Ativa ?? true; });

        Cadastro<Curso, CursoIn>(admin, "/cursos",
            c => new { id = c.Id, nome = c.Nome, setorCoordenacaoId = c.SetorCoordenacaoId },
            async (db, i, atual) =>
            {
                if (!Nome(i.Nome, 200)) return Problemas.Invalido("Informe o nome do curso.", "nome");
                if (i.SetorCoordenacaoId is { } s && !await db.Setores.AnyAsync(x => x.Id == s)) return Problemas.Invalido("Setor de coordenação inexistente.", "setorCoordenacaoId");
                return await db.Cursos.AnyAsync(c => c.Nome == i.Nome && c.Id != (atual == null ? 0 : atual.Id)) ? Repetido("Já existe um curso com este nome.") : null;
            },
            (c, i) => { c.Nome = i.Nome!; c.SetorCoordenacaoId = i.SetorCoordenacaoId; });

        Cadastro<RespostaPronta, RespostaProntaIn>(admin, "/respostas-prontas",
            r => new { id = r.Id, setorId = r.SetorId, titulo = r.Titulo, texto = r.Texto },
            async (db, i, atual) =>
            {
                if (!await db.Setores.AnyAsync(s => s.Id == i.SetorId)) return Problemas.Invalido("Setor inexistente.", "setorId");
                if (!Nome(i.Titulo, 200)) return Problemas.Invalido("Informe o título.", "titulo");
                if (string.IsNullOrWhiteSpace(i.Texto) || i.Texto.Length > 4000) return Problemas.Invalido("O texto deve ter de 1 a 4000 caracteres.", "texto");
                return await db.RespostasProntas.AnyAsync(r => r.SetorId == i.SetorId && r.Titulo == i.Titulo && r.Id != (atual == null ? 0 : atual.Id)) ? Repetido("Já existe uma resposta pronta com este título no setor.") : null;
            },
            (r, i) => { r.SetorId = i.SetorId!.Value; r.Titulo = i.Titulo!; r.Texto = i.Texto!; });

        Regras(admin);
        ArtigoRotas.MapearAdmin(admin);
        DocumentoRotas.MapearAdmin(admin);
    }

    // GET lista, POST cria, PUT {id} altera; validar devolve 400/409 ou null.
    static void Cadastro<T, TIn>(RouteGroupBuilder admin, string rota, Func<T, object> saida, Func<OneDb, TIn, T?, Task<IResult?>> validar, Action<T, TIn> aplicar)
        where T : class, IDaInstituicao, new()
    {
        admin.MapGet(rota, async (OneDb db) =>
            Results.Ok((await db.Set<T>().OrderBy(e => EF.Property<long>(e, "Id")).ToListAsync()).Select(saida)));

        admin.MapPost(rota, async (TIn i, OneDb db) =>
        {
            if (await validar(db, i, null) is { } erro) return erro;
            var novo = new T();
            aplicar(novo, i);
            db.Set<T>().Add(novo);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin{rota}/{db.Entry(novo).Property<long>("Id").CurrentValue}", saida(novo));
        });

        admin.MapPut(rota + "/{id:long}", async (long id, TIn i, OneDb db) =>
        {
            var atual = await db.Set<T>().FirstOrDefaultAsync(e => EF.Property<long>(e, "Id") == id);
            if (atual is null) return NaoEncontrado();
            if (await validar(db, i, atual) is { } erro) return erro;
            aplicar(atual, i);
            await db.SaveChangesAsync();
            return Results.Ok(saida(atual));
        });
    }

    // AC 114: uma regra por categoria; salvar de novo substitui a anterior.
    static void Regras(RouteGroupBuilder admin)
    {
        static object Saida(RegraRoteamento r) => new { id = r.Id, categoriaId = r.CategoriaId, destino = r.Destino, setorId = r.SetorId };

        static async Task<IResult?> Validar(OneDb db, RegraIn i)
        {
            if (!await db.Categorias.AnyAsync(c => c.Id == i.CategoriaId && !c.Padrao)) return Problemas.Invalido("Escolha uma categoria que não seja \"Não classificado\".", "categoriaId");
            if (i.Destino is not ("SETOR" or "COORDENACAO_CURSO")) return Problemas.Invalido("O destino deve ser SETOR ou COORDENACAO_CURSO.", "destino");
            if (i.Destino == "SETOR" && !await db.Setores.AnyAsync(s => s.Id == i.SetorId)) return Problemas.Invalido("Informe o setor de destino.", "setorId"); // AC 115
            return null;
        }

        static void Aplicar(RegraRoteamento r, RegraIn i)
        {
            r.CategoriaId = i.CategoriaId!.Value;
            r.Destino = i.Destino!;
            r.SetorId = i.Destino == "SETOR" ? i.SetorId : null;
        }

        admin.MapGet("/regras", async (OneDb db) => Results.Ok((await db.Regras.OrderBy(r => r.Id).ToListAsync()).Select(Saida)));

        admin.MapPost("/regras", async (RegraIn i, OneDb db) =>
        {
            if (await Validar(db, i) is { } erro) return erro;
            var regra = await db.Regras.FirstOrDefaultAsync(r => r.CategoriaId == i.CategoriaId);
            var nova = regra is null;
            regra ??= db.Regras.Add(new RegraRoteamento()).Entity;
            Aplicar(regra, i);
            await db.SaveChangesAsync();
            return nova ? Results.Created($"/api/admin/regras/{regra.Id}", Saida(regra)) : Results.Ok(Saida(regra));
        });

        admin.MapPut("/regras/{id:long}", async (long id, RegraIn i, OneDb db) =>
        {
            var regra = await db.Regras.FirstOrDefaultAsync(r => r.Id == id);
            if (regra is null) return NaoEncontrado();
            if (await Validar(db, i) is { } erro) return erro;
            if (await db.Regras.AnyAsync(r => r.CategoriaId == i.CategoriaId && r.Id != id)) return Repetido("Esta categoria já tem uma regra.");
            Aplicar(regra, i);
            await db.SaveChangesAsync();
            return Results.Ok(Saida(regra));
        });
    }

    static void Usuarios(RouteGroupBuilder admin)
    {
        static async Task<object> Saida(OneDb db, Usuario u) => new
        {
            id = u.Id,
            cpf = u.Cpf,
            nome = u.Nome,
            email = u.Email,
            ativo = u.Ativo,
            deveTrocarSenha = u.DeveTrocarSenha,
            papeis = u.Papeis.Select(p => p.Papel),
            setores = await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId).ToListAsync(),
        };

        // 400 nos campos, 409 em CPF ou e-mail repetidos na instituição (AC 108, AC 109).
        static async Task<IResult?> Validar(OneDb db, UsuarioIn i, long id)
        {
            var cpf = Cpf.Normalizar(i.Cpf);
            if (cpf is null) return Problemas.Invalido("CPF inválido.", "cpf");
            if (!Nome(i.Nome, 200)) return Problemas.Invalido("Informe o nome.", "nome");
            if (i.Email is null || !Email.Valido().IsMatch(i.Email)) return Problemas.Invalido("E-mail inválido.", "email");
            if (i.Papeis is not { Length: > 0 } || i.Papeis.Any(p => !PapeisValidos.Contains(p))) return Problemas.Invalido("Escolha ao menos um papel.", "papeis");
            var setores = i.Setores ?? [];
            if (i.Papeis.Contains(Papeis.Atendente) && setores.Length == 0) return Problemas.Invalido("Escolha ao menos um setor para o atendente.", "setores");
            if (await db.Setores.CountAsync(s => setores.Contains(s.Id)) != setores.Distinct().Count()) return Problemas.Invalido("Setor inexistente.", "setores");
            if (i.SenhaTemporaria is not null && !Senha.Valida(i.SenhaTemporaria)) return Problemas.Invalido($"A senha temporária deve ter de {Senha.Minimo} a {Senha.Maximo} caracteres.", "senhaTemporaria");
            if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Cpf == cpf)) return Repetido("Já existe um usuário com este CPF na instituição.");
            if (await db.Usuarios.AnyAsync(u => u.Id != id && u.Email == i.Email)) return Repetido("Já existe um usuário com este e-mail na instituição.");
            return null;
        }

        static async Task Aplicar(OneDb db, Usuario u, UsuarioIn i, Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario> hasher)
        {
            u.Cpf = Cpf.Normalizar(i.Cpf)!;
            u.Nome = i.Nome!;
            u.Email = i.Email!;
            u.Papeis.RemoveAll(p => !i.Papeis!.Contains(p.Papel));
            u.Papeis.AddRange(i.Papeis!.Distinct().Where(p => !u.Tem(p)).Select(p => new UsuarioPapel { Papel = p }));
            if (i.SenhaTemporaria is not null)
            {
                u.SenhaHash = hasher.HashPassword(u, i.SenhaTemporaria);
                u.DeveTrocarSenha = true; // AC 110
            }
            var setores = i.Papeis!.Contains(Papeis.Atendente) ? i.Setores!.Distinct().ToList() : [];
            if (u.Id != 0) db.AtendenteSetores.RemoveRange(await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id && !setores.Contains(a.SetorId)).ToListAsync());
            var atuais = u.Id == 0 ? [] : await db.AtendenteSetores.Where(a => a.UsuarioId == u.Id).Select(a => a.SetorId).ToListAsync();
            await db.SaveChangesAsync();
            db.AtendenteSetores.AddRange(setores.Except(atuais).Select(s => new AtendenteSetor { UsuarioId = u.Id, SetorId = s }));
        }

        admin.MapGet("/usuarios", async (OneDb db) =>
        {
            var lista = new List<object>();
            foreach (var u in await db.Usuarios.Include(u => u.Papeis).OrderBy(u => u.Nome).ToListAsync()) lista.Add(await Saida(db, u));
            return Results.Ok(lista);
        });

        admin.MapPost("/usuarios", async (UsuarioIn i, OneDb db, Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario> hasher) =>
        {
            if (await Validar(db, i, 0) is { } erro) return erro;
            var u = db.Usuarios.Add(new Usuario()).Entity;
            await using var tx = await db.Database.BeginTransactionAsync();
            await Aplicar(db, u, i, hasher);
            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return Results.Created($"/api/admin/usuarios/{u.Id}", await Saida(db, u));
        });

        admin.MapPut("/usuarios/{id:long}", async (long id, UsuarioIn i, OneDb db, Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario> hasher) =>
        {
            var u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Id == id);
            if (u is null) return NaoEncontrado();
            if (await Validar(db, i, id) is { } erro) return erro;
            await using var tx = await db.Database.BeginTransactionAsync();
            await Aplicar(db, u, i, hasher);
            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return Results.Ok(await Saida(db, u));
        });

        // AC 111 e 112: nada do histórico some; os chamados do atendente voltam para a fila do setor.
        admin.MapPost("/usuarios/{id:long}/desativar", async (long id, HttpContext ctx, OneDb db, TimeProvider relogio) =>
        {
            var u = await db.Usuarios.Include(x => x.Papeis).FirstOrDefaultAsync(x => x.Id == id);
            if (u is null) return NaoEncontrado();
            var agora = relogio.GetUtcNow().UtcDateTime;
            var adminId = ctx.Usuario().Id;
            u.Ativo = false;
            foreach (var c in await db.Chamados.Where(c => c.ResponsavelId == id && c.Estado != Fechado).ToListAsync())
            {
                db.EventosChamado.Add(new EventoChamado { ChamadoId = c.Id, Tipo = TiposEvento.Atribuicao, AtorId = adminId, De = u.Nome, Detalhe = "Responsável desativado", CriadoEm = agora });
                c.ResponsavelId = null;
                if (c.Estado is EmAtendimento or AguardandoAluno)
                {
                    db.EventosChamado.Add(new EventoChamado { ChamadoId = c.Id, Tipo = TiposEvento.Transicao, AtorId = adminId, De = c.Estado, Para = Aberto, CriadoEm = agora });
                    c.Estado = Aberto;
                    c.AguardandoDesde = null;
                }
            }
            await db.SaveChangesAsync();
            return Results.Ok(await Saida(db, u));
        });
    }
}
