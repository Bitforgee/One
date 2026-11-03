using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Npgsql;
using One.Api.Dados;
using One.Api.Tests.Infra;

namespace One.Api.Tests;

public class ArquiteturaTests(OneFactory f) : IClassFixture<OneFactory>
{
    static readonly string[] TabelasDaInstituicao =
    [
        "usuario", "usuario_papel", "setor", "atendente_setor", "curso", "matricula", "categoria", "regra_roteamento",
        "artigo", "versao_artigo", "token_acesso", "conversa", "mensagem_conversa", "citacao_artigo", "chamado",
        "mensagem_chamado", "anexo", "evento_chamado", "resposta_pronta", "email_saida",
        "documento", "versao_documento", "trecho_fonte",
    ];

    public static string Raiz()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (!File.Exists(Path.Combine(d!.FullName, "One.slnx"))) d = d.Parent;
        return d.FullName;
    }

    async Task<List<(string tabela, string coluna, string tipo, bool nula)>> Colunas()
    {
        await using var con = new NpgsqlConnection(f.ConnectionString);
        await con.OpenAsync();
        await using var cmd = new NpgsqlCommand("""
            SELECT table_name, column_name, data_type, is_nullable = 'YES' FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name <> '__EFMigrationsHistory'
            """, con);
        await using var r = await cmd.ExecuteReaderAsync();
        var lista = new List<(string, string, string, bool)>();
        while (await r.ReadAsync()) lista.Add((r.GetString(0), r.GetString(1), r.GetString(2), r.GetBoolean(3)));
        return lista;
    }

    [Fact]
    public async Task Toda_entidade_tem_instituicao_e_filtro()
    {
        var modelo = await f.Db(null, db => Task.FromResult(db.Model));
        var entidades = modelo.GetEntityTypes().Where(e => e.ClrType != typeof(Instituicao)).ToList();

        Assert.Equal(TabelasDaInstituicao.Order(), entidades.Select(e => e.GetTableName()!).Order());
        foreach (var e in entidades)
        {
            var prop = e.FindProperty("InstituicaoId");
            Assert.True(prop is { IsNullable: false }, $"{e.GetTableName()} sem instituicao_id não nulo");
            Assert.Equal("instituicao_id", prop!.GetColumnName());
            Assert.Contains(e.GetForeignKeys(), fk => fk.PrincipalEntityType.ClrType == typeof(Instituicao) && fk.Properties.Single() == prop);
            Assert.NotEmpty(e.GetDeclaredQueryFilters());
        }

        var colunas = await Colunas();
        foreach (var t in TabelasDaInstituicao)
            Assert.Contains(colunas, c => c.tabela == t && c.coluna == "instituicao_id" && c.tipo == "bigint" && !c.nula);

        // o filtro funciona: a sessão de outra instituição não enxerga a linha
        var univag = await f.Instituicao();
        var demo = await f.Instituicao();
        Assert.Empty(await f.Db(demo.Id, db => db.Setores.Where(s => s.InstituicaoId == univag.Id).ToListAsync()));
        Assert.Single(await f.Db(univag.Id, db => db.Setores.ToListAsync()));
    }

    [Fact]
    public void IgnoreQueryFilters_so_no_agendador_e_no_comando()
    {
        var api = Path.Combine(Raiz(), "api");
        var permitidos = new[] { Path.Combine(api, "Instituicoes", "InstituicaoComando.cs"), Path.Combine(api, "Agendador.cs") };
        var sep = Path.DirectorySeparatorChar;
        var usos = Directory.EnumerateFiles(api, "*.cs", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{sep}bin{sep}") && !p.Contains($"{sep}obj{sep}"))
            .Where(p => File.ReadAllText(p).Contains("IgnoreQueryFilters"));
        Assert.All(usos, p => Assert.Contains(p, permitidos));
    }

    [Fact]
    public void Layout_e_compose()
    {
        var raiz = Raiz();
        var compose = File.ReadAllText(Path.Combine(raiz, "docker-compose.yml"));
        Assert.Matches(new Regex(@"^\s+image:\s*pgvector/pgvector:0\.8\.7-pg18-trixie\s*$", RegexOptions.Multiline), compose); // RAG, doors R2 e R8
        Assert.Matches(new Regex(@"^\s+image:\s*axllent/mailpit\s*$", RegexOptions.Multiline), compose);

        var solucao = File.ReadAllText(Path.Combine(raiz, "One.slnx"));
        Assert.Contains("api/One.Api.csproj", solucao);
        Assert.Contains("api.Tests/One.Api.Tests.csproj", solucao);
        Assert.Contains("web/package.json", solucao);
        Assert.True(File.Exists(Path.Combine(raiz, "web", "package.json")));
        Assert.True(File.Exists(Path.Combine(raiz, "api", "One.Api.csproj")));
        Assert.True(File.Exists(Path.Combine(raiz, "api.Tests", "One.Api.Tests.csproj")));
    }

    [Fact]
    public async Task Tabelas_snake_case_e_datas_timestamptz()
    {
        var snake = new Regex("^[a-z][a-z0-9_]*$");
        var modelo = await f.Db(null, db => Task.FromResult(db.Model));
        foreach (var e in modelo.GetEntityTypes())
        {
            Assert.Matches(snake, e.GetTableName()!);
            var tabela = StoreObjectIdentifier.Table(e.GetTableName()!);
            foreach (var p in e.GetProperties())
            {
                Assert.Matches(snake, p.GetColumnName(tabela)!);
                if (p.ClrType == typeof(DateTime) || p.ClrType == typeof(DateTime?))
                    Assert.Equal("timestamp with time zone", p.GetColumnType());
            }
        }
        var colunas = await Colunas();
        Assert.All(colunas, c => Assert.Matches(snake, c.tabela));
        Assert.All(colunas, c => Assert.Matches(snake, c.coluna));
        Assert.All(colunas.Where(c => c.tipo.StartsWith("timestamp")), c => Assert.Equal("timestamp with time zone", c.tipo));
        Assert.Contains(colunas, c => c.tipo == "timestamp with time zone");
    }

    // refatoracao-solid: regras de texto sobre o código de api/, sem bin, obj nem Dados/Migracoes.
    static string Api => Path.Combine(Raiz(), "api");

    static IEnumerable<string> CodigoApi()
    {
        var sep = Path.DirectorySeparatorChar;
        return Directory.EnumerateFiles(Api, "*.cs", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{sep}bin{sep}") && !p.Contains($"{sep}obj{sep}") && !p.Contains($"{sep}Dados{sep}Migracoes{sep}"));
    }

    static string Relativo(string p) => Path.GetRelativePath(Api, p).Replace('\\', '/');

    // Código sem os comentários de linha; o // de uma URL (precedido de ":") fica.
    static string SemComentarios(string p) => Regex.Replace(File.ReadAllText(p), @"(?m)(?<![:""/])//.*$", "");

    static List<string> ArquivosQue(Regex padrao, IEnumerable<string>? arquivos = null) =>
        (arquivos ?? CodigoApi()).Where(p => padrao.IsMatch(SemComentarios(p))).Select(Relativo).Order().ToList();

    static readonly Dictionary<Type, string[]> LiteraisGravados = new()
    {
        [typeof(TiposEvento)] = ["CRIACAO", "TRANSICAO", "ATRIBUICAO", "LEMBRETE", "NOTA", "RESPOSTA", "ANEXO", "ENCAMINHAMENTO", "RECLASSIFICACAO"],
        [typeof(TiposMensagem)] = ["PUBLICA", "NOTA"],
        [typeof(MotivosFechamento)] = ["CONFIRMADO", "CANCELADO", "DUPLICADO", "FECHADO_AUTOMATICAMENTE"],
    };

    // C12
    [Fact]
    public void Literais_gravados_so_nas_constantes()
    {
        foreach (var (grupo, literais) in LiteraisGravados)
        {
            var valores = grupo.GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)
                .Where(c => c.IsLiteral).Select(c => (string)c.GetRawConstantValue()!).Order().ToList();
            Assert.Equal(literais.Order(), valores);
        }
        foreach (var literal in LiteraisGravados.Values.SelectMany(l => l).Distinct())
            Assert.Equal(["Dados/Entidades.cs"], ArquivosQue(new Regex($"\"{literal}\"")));
    }

    // C13
    [Fact]
    public void Ultima_versao_em_um_arquivo()
    {
        var arquivos = ArquivosQue(new Regex(@"(OrderByDescending|MaxAsync|Max)\(\s*(\w+)\s*=>\s*\2\.Numero\s*\)"));
        Assert.Single(arquivos);
        Assert.StartsWith("Conhecimento/", arquivos[0]);
    }

    // C14
    [Fact]
    public void Artigo_ou_documento_em_um_arquivo()
    {
        var sep = Path.DirectorySeparatorChar;
        var arquivos = ArquivosQue(new Regex(@"(VersaoArtigoId|VersaoDocumentoId)\s*(==\s*null|!=\s*null|is\s*\{|is\s+null|is\s+not\s+null)"),
            CodigoApi().Where(p => !p.Contains($"{sep}Dados{sep}")));
        Assert.Single(arquivos);
        Assert.StartsWith("Conhecimento/", arquivos[0]);
    }

    // C15
    [Fact]
    public void Configuracao_lida_em_um_lugar()
    {
        int Leituras(string chave) => CodigoApi().Sum(p => Regex.Matches(File.ReadAllText(p), Regex.Escape($"\"{chave}\"")).Count);
        foreach (var chave in new[] { "Llm:BaseUrl", "Llm:ChaveApi", "App:UrlBase" })
            Assert.True(Leituras(chave) == 1, $"{chave} lida {Leituras(chave)} vezes");
        // o registro do cliente "llm" passa um método nomeado; as duas chaves são lidas dentro dele
        var program = File.ReadAllText(Path.Combine(Api, "Program.cs"));
        var metodo = Regex.Match(program, @"AddHttpClient\(""llm"", (\w+)\)").Groups[1].Value;
        Assert.NotEqual("", metodo);
        var registro = Regex.Match(program, $@"static void {metodo}\(IServiceProvider \w+, HttpClient \w+\)\s*\{{.*?\n    \}}", RegexOptions.Singleline).Value;
        Assert.Contains("\"Llm:BaseUrl\"", registro);
        Assert.Contains("\"Llm:ChaveApi\"", registro);
    }

    // C17
    [Fact]
    public void Assinatura_de_arquivo_em_um_lugar() =>
        Assert.Single(ArquivosQue(new Regex(@"0x25,\s*0x50,\s*0x44,\s*0x46")));

    // C18
    [Fact]
    public void Limites_de_senha_em_um_lugar()
    {
        var arquivos = ArquivosQue(new Regex(@"\b128\b"));
        Assert.Single(arquivos);
        var texto = File.ReadAllText(Path.Combine(Api, arquivos[0]));
        Assert.Matches(@"const int \w+ = 8;", texto);
        Assert.Matches(@"const int \w+ = 128;", texto);
        Assert.Empty(ArquivosQue(new Regex(@"Length:\s*>=\s*8\b")));
    }

    // C27: as regras puras são testadas sem subir o PostgreSQL nem o host HTTP
    [Fact]
    public void Testes_de_regra_sem_banco()
    {
        foreach (var classe in new[] { "PermissoesChamadoTests", "IndicadoresCalculoTests", "CargaValidacaoTests", "CsvMatriculasTests", "PerguntaTests" })
        {
            var texto = File.ReadAllText(Path.Combine(Raiz(), "api.Tests", classe + ".cs"));
            Assert.Contains($"public class {classe}", texto);
            foreach (var proibido in new[] { "OneFactory", "OneDb", "HttpClient" })
                Assert.False(texto.Contains(proibido), $"{classe} usa {proibido}");
        }
    }

    // C19
    [Fact]
    public void Sem_DateTime_Now() =>
        Assert.Empty(ArquivosQue(new Regex(@"DateTime\.(UtcNow|Now)\b")));

    // C20
    [Fact]
    public void Glossario_lista_os_termos()
    {
        var linhas = File.ReadAllLines(Path.Combine(Raiz(), ".specs", "GLOSSARIO.md")).Where(l => l.StartsWith('|')).ToList();
        static string Significado(string linha) => linha.Trim().Trim('|').Split('|')[^1].Trim();
        var grupos = new Dictionary<Type, string>
        {
            [typeof(TiposEvento)] = "tipo de evento",
            [typeof(TiposMensagem)] = "tipo de mensagem",
            [typeof(MotivosFechamento)] = "motivo de fechamento",
        };
        foreach (var (tipo, literais) in LiteraisGravados)
            foreach (var literal in literais)
                Assert.True(linhas.Any(l => l.Contains($"`{literal}`") && l.Contains(grupos[tipo]) && Significado(l).Length >= 10), $"{literal} ({grupos[tipo]})");
        foreach (var (prazo, chave, padrao) in new[]
        {
            ("abandono", "Prazos:AbandonoMinutos", "30 min"), ("confirmação", "Prazos:ConfirmacaoDias", "7 dias"), ("rejeição", "Prazos:ConfirmacaoDias", "7 dias"),
            ("lembrete", "Prazos:LembreteAguardandoDias", "3 dias"), ("resolver aguardando", "Prazos:ResolverAguardandoDias", "7 dias"),
        })
            Assert.True(linhas.Any(l => l.Contains($"prazo de {prazo}") && l.Contains($"`{chave}`") && l.Contains(padrao) && Significado(l).Length >= 10), prazo);
    }

    // C6: door 2, a barreira de complexidade 10 no build do api/
    [Fact]
    public void Barreira_de_complexidade_configurada()
    {
        Assert.Contains("CA1502(Method): 10", File.ReadAllLines(Path.Combine(Api, "CodeMetricsConfig.txt")).Select(l => l.Trim()));
        var projeto = System.Xml.Linq.XDocument.Load(Path.Combine(Api, "One.Api.csproj"));
        Assert.Contains(projeto.Descendants("AdditionalFiles"), e => (string?)e.Attribute("Include") == "CodeMetricsConfig.txt");
        Assert.Contains(projeto.Descendants("WarningsAsErrors"), e => e.Value.Split(';').Select(x => x.Trim()).Contains("CA1502"));
        Assert.Matches(@"(?m)^\s*dotnet_diagnostic\.CA1502\.severity\s*=\s*warning\s*$", File.ReadAllText(Path.Combine(Raiz(), ".editorconfig")));
    }

    static readonly string[] Fatias = ["Acesso", "Assistente", "Chamados", "Conhecimento", "Indicadores", "Administracao", "Instituicoes"];

    static IEnumerable<string> DaPasta(string pasta) => Directory.EnumerateFiles(Path.Combine(Api, pasta), "*.cs", SearchOption.AllDirectories);

    // C28
    [Fact]
    public void Chamados_nao_consulta_versoes() =>
        Assert.Empty(ArquivosQue(new Regex(@"\bVersoes(Artigo|Documento)\b"), DaPasta("Chamados")));

    // C29: door 3, as 7 fatias e o compartilhado (Dados e os arquivos da raiz)
    [Fact]
    public void Fatias_do_api()
    {
        var pastas = Directory.GetDirectories(Api).Select(Path.GetFileName).Except(["bin", "obj", "Properties", "wwwroot"]).Order();
        Assert.Equal([.. Fatias.Append("Dados").Order()], pastas);
        Assert.False(Directory.Exists(Path.Combine(Api, "Rotas")));
        Assert.False(Directory.Exists(Path.Combine(Api, "Comando")));
        Assert.Equal(["Agendador", "Cpf", "Email", "Prazos", "Problemas", "Program", "Sessao", "Tokens"],
            Directory.GetFiles(Api, "*.cs").Select(Path.GetFileNameWithoutExtension).Order());
    }

    // C30
    [Fact]
    public void Namespace_igual_a_pasta()
    {
        foreach (var arquivo in CodigoApi())
        {
            var pasta = Path.GetRelativePath(Api, Path.GetDirectoryName(arquivo)!);
            var esperado = pasta == "." ? "One.Api" : "One.Api." + pasta.Replace(Path.DirectorySeparatorChar, '.');
            var declarados = Regex.Matches(SemComentarios(arquivo), @"^namespace\s+([\w.]+)\s*[;{]", RegexOptions.Multiline).Select(m => m.Groups[1].Value);
            Assert.True(declarados.SequenceEqual([esperado]), $"{Relativo(arquivo)}: [{string.Join(", ", declarados)}], esperado {esperado}");
        }
    }

    // C31: door 3, uma fatia só usa outra pelos pares desta lista, e a lista não tem par que o código não usa
    static readonly (string de, string para)[] ReferenciasEntreFatias =
    [
        ("Administracao", "Acesso"), ("Administracao", "Conhecimento"),
        ("Assistente", "Chamados"), ("Assistente", "Conhecimento"),
        ("Chamados", "Assistente"), ("Chamados", "Conhecimento"),
        ("Indicadores", "Assistente"), ("Indicadores", "Conhecimento"),
        ("Instituicoes", "Assistente"), ("Instituicoes", "Conhecimento"),
    ];

    [Fact]
    public void Referencias_entre_fatias()
    {
        var usadas = new HashSet<(string, string)>();
        foreach (var de in Fatias)
            foreach (var arquivo in DaPasta(de))
            {
                var codigo = SemComentarios(arquivo);
                foreach (var para in Fatias.Where(f => f != de))
                    if (Regex.IsMatch(codigo, $@"using\s+(static\s+)?One\.Api\.{para}\b|(?<![\w.])(One\.Api\.)?{para}\.[A-Z]"))
                        usadas.Add((de, para));
            }
        Assert.Equal(ReferenciasEntreFatias.Order(), usadas.Order());
    }

    // C32: a rota de importação de matrículas (POST /api/admin/matriculas/importacao) mora num arquivo que não mapeia outra
    [Fact]
    public void Importacao_em_arquivo_proprio()
    {
        var arquivo = Assert.Single(DaPasta("Administracao"), p => File.ReadAllText(p).Contains("\"/matriculas/importacao\""));
        Assert.Single(Regex.Matches(SemComentarios(arquivo), @"\.Map\w*\("));
    }

    // vertical-slice-completa C7: door 1, o Mediator 3.0.2 sem MediatR, com CA1502 e MSG0005 como erro
    [Fact]
    public void Mediator_referenciado()
    {
        var projeto = System.Xml.Linq.XDocument.Load(Path.Combine(Api, "One.Api.csproj"));
        var pacotes = projeto.Descendants("PackageReference").ToList();
        string? Valor(System.Xml.Linq.XElement e, string nome) => (string?)e.Attribute(nome) ?? e.Element(nome)?.Value;
        var abstracoes = Assert.Single(pacotes, p => (string?)p.Attribute("Include") == "Mediator.Abstractions");
        Assert.Equal("3.0.2", Valor(abstracoes, "Version"));
        var gerador = Assert.Single(pacotes, p => (string?)p.Attribute("Include") == "Mediator.SourceGenerator");
        Assert.Equal("3.0.2", Valor(gerador, "Version"));
        Assert.Equal("all", Valor(gerador, "PrivateAssets"));
        Assert.DoesNotContain(pacotes, p => ((string?)p.Attribute("Include") ?? "").StartsWith("MediatR", StringComparison.OrdinalIgnoreCase));
        var comoErro = projeto.Descendants("WarningsAsErrors").SelectMany(e => e.Value.Split(';')).Select(x => x.Trim()).ToList();
        Assert.Contains("CA1502", comoErro);
        Assert.Contains("MSG0005", comoErro);
    }

    static bool Concreto(Type t) => t is { IsAbstract: false, IsInterface: false, IsGenericTypeDefinition: false };

    static Type? Fechado(Type t, Type aberto) =>
        t.GetInterfaces().FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == aberto);

    // vertical-slice-completa: as mensagens do mediator (Mediator.IRequest<T>, direto ou por IAcaoChamado) e o T de cada uma
    public static List<(Type mensagem, Type resposta)> Mensagens() =>
        typeof(Program).Assembly.GetTypes().Where(Concreto)
            .Select(t => (t, Fechado(t, typeof(Mediator.IRequest<>))))
            .Where(x => x.Item2 is not null)
            .Select(x => (x.t, x.Item2!.GetGenericArguments()[0])).ToList();

    static string ArquivoDo(Type t) => Path.Combine(Api, t.Namespace!["One.Api.".Length..], t.Name + ".cs");

    // C11: door 3, um arquivo por caso de uso, com a mensagem e o Mapear, numa das 7 fatias
    [Fact]
    public void Um_arquivo_por_caso_de_uso()
    {
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.Equal(58, mensagens.Count);
        var porFatia = new Dictionary<string, int> { ["Acesso"] = 6, ["Assistente"] = 7, ["Chamados"] = 13, ["Conhecimento"] = 11, ["Indicadores"] = 1, ["Administracao"] = 20, ["Instituicoes"] = 0 };
        foreach (var (fatia, n) in porFatia)
            Assert.True(mensagens.Count(t => t.Namespace == $"One.Api.{fatia}") == n, $"{fatia}: {mensagens.Count(t => t.Namespace == $"One.Api.{fatia}")}, esperado {n}");
        var declaraMensagem = new Regex(@"\b(class|record|struct)\s+\w+[^{;]*?:\s*[^{;]*?(\bIRequest<|\bIAcaoChamado\b)");
        foreach (var t in mensagens)
        {
            Assert.DoesNotContain(t.Name, Fatias);
            var arquivo = ArquivoDo(t);
            Assert.True(File.Exists(arquivo), $"{t.Name}: sem {Relativo(arquivo)}");
            var codigo = SemComentarios(arquivo);
            Assert.True(declaraMensagem.Matches(codigo).Count == 1, $"{Relativo(arquivo)}: {declaraMensagem.Matches(codigo).Count} mensagens declaradas");
            Assert.Contains($" {t.Name}", declaraMensagem.Match(codigo).Value);
            Assert.Contains("public static void Mapear(RouteGroupBuilder", codigo);
        }
    }

    // C12: door 3, um handler por mensagem, no mesmo arquivo
    [Fact]
    public void Um_handler_por_mensagem_no_mesmo_arquivo()
    {
        var handlers = typeof(Program).Assembly.GetTypes().Where(Concreto)
            .Select(t => (handler: t, contrato: Fechado(t, typeof(Mediator.IRequestHandler<,>)))).Where(x => x.contrato is not null).ToList();
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.Equal(58, handlers.Count);
        Assert.Equal(mensagens.Order(Comparer<Type>.Create((a, b) => string.CompareOrdinal(a.FullName, b.FullName))),
            handlers.Select(h => h.contrato!.GetGenericArguments()[0]).Order(Comparer<Type>.Create((a, b) => string.CompareOrdinal(a.FullName, b.FullName))));
        foreach (var (handler, contrato) in handlers)
        {
            var mensagem = contrato!.GetGenericArguments()[0];
            Assert.Equal(mensagem.Name + "Handler", handler.Name);
            Assert.Matches($@"\bclass\s+{handler.Name}\b", SemComentarios(ArquivoDo(mensagem)));
        }
    }

    // C13: um Map* por caso de uso; fora deles só o logout e os 2 fallbacks do Program
    [Fact]
    public void Map_so_nos_casos_de_uso()
    {
        var map = new Regex(@"\.(MapGet|MapPost|MapPut|MapDelete|MapPatch|MapMethods|MapFallback\w*)\(");
        var porArquivo = CodigoApi().Select(p => (arquivo: Relativo(p), maps: map.Matches(SemComentarios(p)).Select(m => m.Value).ToList()))
            .Where(x => x.maps.Count > 0).ToDictionary(x => x.arquivo, x => x.maps);
        var casos = Mensagens().Select(m => Relativo(ArquivoDo(m.mensagem))).ToHashSet();

        Assert.Equal(61, porArquivo.Values.Sum(m => m.Count));
        foreach (var caso in casos)
            Assert.True(porArquivo.GetValueOrDefault(caso)?.Count == 1, $"{caso}: {porArquivo.GetValueOrDefault(caso)?.Count ?? 0} Map*");
        Assert.Equal([".MapFallback(", ".MapFallbackToFile("], porArquivo["Program.cs"].Order());
        var resto = Assert.Single(porArquivo.Keys.Except(casos).Except(["Program.cs"]));
        Assert.Single(porArquivo[resto]);
        Assert.Matches(new Regex(@"\.MapPost\(""/auth/logout"""), SemComentarios(Path.Combine(Api, resto)));
    }

    // C14: o que fica fora do mediator não o referencia
    [Fact]
    public void Fora_do_mediator()
    {
        var logout = Assert.Single(CodigoApi(), p => File.ReadAllText(p).Contains("\"/auth/logout\""));
        foreach (var arquivo in new[] { Path.Combine(Api, "Agendador.cs"), Path.Combine(Api, "Sessao.cs"), Path.Combine(Api, "Instituicoes", "InstituicaoComando.cs"), logout })
        {
            var codigo = File.ReadAllText(arquivo);
            foreach (var proibido in new[] { "IMediator", "ISender", "using Mediator" })
                Assert.False(codigo.Contains(proibido), $"{Relativo(arquivo)} contém {proibido}");
        }
    }

    // C19: door 6, mensagem e handler não dependem do HttpContext
    [Fact]
    public void Handler_sem_HttpContext()
    {
        var proibidos = new[] { typeof(HttpContext), typeof(HttpRequest), typeof(IHttpContextAccessor) };
        foreach (var (mensagem, _) in Mensagens())
            Assert.All(mensagem.GetProperties(), p => Assert.DoesNotContain(p.PropertyType, proibidos));
        var handlers = typeof(Program).Assembly.GetTypes().Where(Concreto).Where(t => Fechado(t, typeof(Mediator.IRequestHandler<,>)) is not null).ToList();
        Assert.Equal(58, handlers.Count);
        foreach (var t in handlers.Append(typeof(One.Api.Chamados.AgirNoChamado<,>)))
            foreach (var c in t.GetConstructors())
                Assert.All(c.GetParameters(), p => Assert.DoesNotContain(p.ParameterType, proibidos));
        var montar = Assert.Single(typeof(One.Api.Chamados.Shared.DetalheChamado).GetMethods(), m => m.Name == "Montar");
        Assert.DoesNotContain(typeof(HttpContext), montar.GetParameters().Select(p => p.ParameterType));
        Assert.Empty(ArquivosQue(new Regex("IHttpContextAccessor")));
    }

    // C23: door 5, a permissão das ações é decidida só no AgirNoChamado
    [Fact]
    public void Permissao_so_no_AgirNoChamado()
    {
        var sep = Path.DirectorySeparatorChar;
        var chamaEstados = CodigoApi().Where(p => !p.EndsWith($"{sep}Chamados{sep}PermissoesChamado.cs"))
            .Where(p =>
            {
                var codigo = SemComentarios(p);
                return Regex.IsMatch(codigo, @"PermissoesChamado\.Estados\(")
                    || (Regex.IsMatch(codigo, @"using\s+static\s+One\.Api\.Chamados\.PermissoesChamado\s*;") && Regex.IsMatch(codigo, @"(?<![\w.])Estados\("));
            }).ToList();
        var arquivo = Assert.Single(chamaEstados);
        Assert.Contains("class AgirNoChamado<", SemComentarios(arquivo));
    }

    // dominio-e-contratos C19 e C29: door 3, o agregado não tem construtor público nem setter público além de InstituicaoId, e expõe os filhos só em leitura
    static bool Init(System.Reflection.PropertyInfo p) =>
        p.SetMethod!.ReturnParameter.GetRequiredCustomModifiers().Contains(typeof(System.Runtime.CompilerServices.IsExternalInit));

    static void AgregadoFechado(Type agregado, string filhos, Type filho)
    {
        Assert.Empty(agregado.GetConstructors());
        Assert.Equal(["InstituicaoId"], agregado.GetProperties().Where(p => p.SetMethod is { IsPublic: true }).Select(p => p.Name));
        var colecao = agregado.GetProperty(filhos)!;
        Assert.Equal(typeof(IReadOnlyCollection<>).MakeGenericType(filho), colecao.PropertyType);
        Assert.Null(colecao.SetMethod);
    }

    static void FilhoAppendOnly(Type filho)
    {
        Assert.Contains(filho.GetProperties(), p => p.Name == "InstituicaoId" && p.SetMethod is { IsPublic: true } && !Init(p));
        Assert.All(filho.GetProperties().Where(p => p.SetMethod is { IsPublic: true } && p.Name != "InstituicaoId"), p => Assert.True(Init(p), $"{filho.Name}.{p.Name} tem set público"));
    }

    static void SemPersistenciaNoArquivo(string arquivo) =>
        Assert.DoesNotMatch(@"OneDb|DbSet|IQueryable|Microsoft\.EntityFrameworkCore", SemComentarios(Path.Combine(Api, "Dados", arquivo)));

    // C19
    [Fact]
    public void Chamado_fechado()
    {
        AgregadoFechado(typeof(Chamado), "Mensagens", typeof(MensagemChamado));
        Assert.Equal(typeof(IReadOnlyCollection<EventoChamado>), typeof(Chamado).GetProperty("Eventos")!.PropertyType);
        Assert.False(typeof(Chamado).GetProperty("Xmin")!.SetMethod is { IsPublic: true });
        foreach (var filho in new[] { typeof(MensagemChamado), typeof(Anexo), typeof(EventoChamado) }) FilhoAppendOnly(filho);
        SemPersistenciaNoArquivo("Chamados/Chamado.cs");
    }

    // C20: fora de Dados e do Agendador ninguém cria mensagem nem evento; as 24 linhas gravadas estão em RetratoTests.Gravacoes_do_chamado_iguais_as_da_base
    [Fact]
    public void Chamado_muda_so_pelos_metodos()
    {
        var sep = Path.DirectorySeparatorChar;
        var fora = CodigoApi().Where(p => !p.Contains($"{sep}Dados{sep}") && !p.EndsWith($"{sep}Agendador.cs"));
        Assert.Empty(ArquivosQue(new Regex(@"new\s+(EventoChamado|MensagemChamado)\b|\b(EventosChamado|MensagensChamado)\.Add"), fora));
    }

    // C29
    [Fact]
    public void Artigo_e_documento_fechados()
    {
        AgregadoFechado(typeof(Artigo), "Versoes", typeof(VersaoArtigo));
        AgregadoFechado(typeof(Documento), "Versoes", typeof(VersaoDocumento));
        FilhoAppendOnly(typeof(VersaoArtigo));
        FilhoAppendOnly(typeof(VersaoDocumento));
        SemPersistenciaNoArquivo("Artigos/Artigo.cs");
        SemPersistenciaNoArquivo("Documentos/Documento.cs");
    }

    static readonly Dictionary<string, string[]> EntidadesPorPasta = new()
    {
        [""] = ["Instituicao"],
        ["Chamados"] = ["Chamado", "MensagemChamado", "Anexo", "EventoChamado"],
        ["Conversas"] = ["Conversa", "MensagemConversa", "CitacaoArtigo"],
        ["Artigos"] = ["Artigo", "VersaoArtigo"],
        ["Documentos"] = ["Documento", "VersaoDocumento"],
        ["Trechos"] = ["TrechoFonte"],
        ["Usuarios"] = ["Usuario", "UsuarioPapel", "Matricula", "TokenAcesso", "AtendenteSetor"],
        ["Cadastros"] = ["Setor", "Curso", "Categoria", "RegraRoteamento", "RespostaPronta"],
        ["Emails"] = ["EmailSaida"],
    };

    static readonly Regex TipoDeTopo = new(@"(?m)^(?:public |internal )?(?:static |sealed |abstract |partial )*(?:class|record|struct|interface|enum)\s+(\w+)");

    // C34: door 5, um tipo por arquivo, na pasta do agregado
    [Fact]
    public async Task Uma_entidade_por_arquivo_por_agregado()
    {
        var modelo = await f.Db(null, db => Task.FromResult(db.Model));
        var tipos = modelo.GetEntityTypes().Select(e => e.ClrType).ToList();
        Assert.Equal(24, tipos.Count);
        Assert.Equal(EntidadesPorPasta.Values.SelectMany(n => n).Order(), tipos.Select(t => t.Name).Order());
        foreach (var (pasta, nomes) in EntidadesPorPasta)
            foreach (var nome in nomes)
            {
                var arquivo = Path.Combine(Api, "Dados", pasta, nome + ".cs");
                Assert.True(File.Exists(arquivo), $"falta Dados/{pasta}/{nome}.cs");
                Assert.Equal([nome], TipoDeTopo.Matches(SemComentarios(arquivo)).Select(m => m.Groups[1].Value));
                Assert.Equal(pasta == "" ? "One.Api.Dados" : $"One.Api.Dados.{pasta}", tipos.Single(t => t.Name == nome).Namespace);
            }
        Assert.Equal(new[] { "IDaInstituicao", "Papeis", "EstadosArtigo", "Desfechos", "EstadosDocumento", "EstadosChamado", "TiposEvento", "TiposMensagem", "MotivosFechamento" }.Order(),
            TipoDeTopo.Matches(SemComentarios(Path.Combine(Api, "Dados", "Entidades.cs"))).Select(m => m.Groups[1].Value).Order());
        foreach (var projeto in new[] { Path.Combine(Api, "One.Api.csproj"), Path.Combine(Raiz(), "api.Tests", "One.Api.Tests.csproj") })
            foreach (var pasta in EntidadesPorPasta.Keys.Where(p => p != ""))
                Assert.Contains($"<Using Include=\"One.Api.Dados.{pasta}\" />", File.ReadAllText(projeto));
    }

    static IEnumerable<Type> TiposUsados(Type t)
    {
        const System.Reflection.BindingFlags todos = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance
            | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.DeclaredOnly;
        IEnumerable<Type> assinaturas = t.GetFields(todos).Select(x => x.FieldType)
            .Concat(t.GetProperties(todos).Select(x => x.PropertyType))
            .Concat(t.GetMethods(todos).SelectMany(m => m.GetParameters().Select(p => p.ParameterType).Append(m.ReturnType)))
            .Concat(t.GetConstructors(todos).SelectMany(c => c.GetParameters().Select(p => p.ParameterType)))
            .Concat(t.GetInterfaces());
        if (t.BaseType is { } b) assinaturas = assinaturas.Append(b);
        return assinaturas.SelectMany(Desembrulhar);
    }

    static IEnumerable<Type> Desembrulhar(Type t) =>
        t.HasElementType ? Desembrulhar(t.GetElementType()!)
        : t.IsGenericType ? t.GetGenericArguments().SelectMany(Desembrulhar).Append(t.GetGenericTypeDefinition()) : [t];

    // C35: door 7, o domínio não depende de ASP.NET Core, de Mediator nem de uma fatia (texto e reflexão)
    [Fact]
    public void Dominio_sem_AspNetCore_Mediator_nem_fatias()
    {
        var sep = Path.DirectorySeparatorChar;
        var dominio = CodigoApi().Where(p => p.Contains($"{sep}Dados{sep}")).ToList();
        Assert.NotEmpty(dominio);
        Assert.Empty(ArquivosQue(new Regex(@"using\s+(static\s+)?(Microsoft\.AspNetCore|Mediator)\b"), dominio));
        Assert.Empty(ArquivosQue(new Regex(@"\b(IResult|Results|HttpContext|HttpRequest|IFormFile|IFormCollection|IMediator|IRequest|Problemas)\b"), dominio));
        Assert.Empty(ArquivosQue(new Regex(@"(?<![\w.])(One\.Api\.)?(Acesso|Assistente|Chamados|Conhecimento|Indicadores|Administracao|Instituicoes)\.[A-Z]"), dominio));

        var fatias = Fatias.Select(x => "One.Api." + x).ToArray();
        var tiposDoDominio = typeof(Program).Assembly.GetTypes()
            .Where(t => t.Namespace is { } ns && ns.StartsWith("One.Api.Dados") && !ns.StartsWith("One.Api.Dados.Migracoes") && !t.Name.Contains('<')).ToList();
        Assert.True(tiposDoDominio.Count > 24);
        foreach (var tipo in tiposDoDominio)
            foreach (var usado in TiposUsados(tipo))
            {
                var assembly = usado.Assembly.GetName().Name!;
                Assert.False(assembly.StartsWith("Microsoft.AspNetCore") || assembly.StartsWith("Mediator"), $"{tipo.Name} usa {usado.FullName} ({assembly})");
                Assert.False(fatias.Any(x => usado.Namespace == x || usado.Namespace?.StartsWith(x + ".") == true), $"{tipo.Name} usa {usado.FullName}");
            }
    }

    // C36: os testes das transições não usam banco nem HTTP, e cada método público das entidades aparece neles
    [Fact]
    public void Testes_de_dominio_sem_banco()
    {
        var publicos = new Dictionary<Type, string[]>
        {
            [typeof(Chamado)] = ["Abrir", "Assumir", "ResponderComoAluno", "ResponderComoEquipe", "Anotar", "Resolver", "Confirmar", "Rejeitar", "Cancelar", "Encaminhar", "Reclassificar", "MarcarDuplicado", "DevolverAFila"],
            [typeof(Artigo)] = ["Criar", "NovaVersao", "Ativar", "Arquivar"],
            [typeof(Documento)] = ["Criar", "NovaVersao", "Arquivar"],
        };
        foreach (var (entidade, metodos) in publicos)
        {
            var classe = entidade.Name + "DominioTests";
            var texto = File.ReadAllText(Path.Combine(Raiz(), "api.Tests", classe + ".cs"));
            Assert.Contains($"public class {classe}", texto);
            foreach (var proibido in new[] { "OneFactory", "OneDb", "HttpClient" })
                Assert.False(texto.Contains(proibido), $"{classe} usa {proibido}");
            var declarados = entidade.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static
                | System.Reflection.BindingFlags.DeclaredOnly).Where(m => !m.IsSpecialName).Select(m => m.Name);
            Assert.Equal(metodos.Order(), declarados.Order());
            foreach (var metodo in metodos) Assert.Contains($".{metodo}(", texto);
        }
    }

    // C37: door 6, nenhuma migração por causa da mudança de pasta e de forma
    [Fact]
    public async Task Modelo_sem_mudanca_pendente()
    {
        Assert.False(await f.Db(null, db => Task.FromResult(db.Database.HasPendingModelChanges())));
        foreach (var migracao in Directory.GetFiles(Path.Combine(Api, "Dados", "Migracoes"), "*DominioRico.cs"))
            Assert.DoesNotContain("migrationBuilder.", SemComentarios(migracao));
    }

    // C38: door 7, os dois projetos de sempre e nenhum repositório sobre o EF
    [Fact]
    public void Dois_projetos_sem_repositorio()
    {
        var projetos = Regex.Matches(File.ReadAllText(Path.Combine(Raiz(), "One.slnx")), "<Project Path=\"([^\"]+)\"").Select(m => m.Groups[1].Value);
        Assert.Equal(["api.Tests/One.Api.Tests.csproj", "api/One.Api.csproj"], projetos.Order(StringComparer.Ordinal));
        IEnumerable<string> Csproj(string pasta) => Directory.GetFiles(pasta, "*.csproj").Concat(Directory.GetDirectories(pasta)
            .Where(d => Path.GetFileName(d) is not ("bin" or "obj" or "node_modules" or ".git" or "target")).SelectMany(Csproj));
        Assert.Equal(2, Csproj(Raiz()).Count());
        Assert.DoesNotContain(typeof(Program).Assembly.GetTypes(), t => t.Name.Contains("Repositor"));
    }

    // C24: as 9 ações do chamado e os 10 nomes de ação de PermissoesChamado
    [Fact]
    public void Nove_acoes_do_chamado()
    {
        var acoes = typeof(Program).Assembly.GetTypes().Where(Concreto).Where(t => typeof(One.Api.Chamados.IAcaoChamado).IsAssignableFrom(t)).ToList();
        Assert.Equal(9, acoes.Count);
        Assert.All(acoes, t => Assert.True(File.Exists(Path.Combine(Api, "Chamados", t.Name + ".cs")) && t.Namespace == "One.Api.Chamados", t.Name));

        // cada ação construída com valores neutros; o formulário de /mensagens uma vez com tipo PUBLICA e uma com NOTA
        object Construir(Type t, string tipo) =>
            Assert.Single(t.GetConstructors()).Invoke([.. Assert.Single(t.GetConstructors()).GetParameters().Select(p =>
                p.ParameterType == typeof(IFormCollection) ? new FormCollection(new() { ["tipo"] = tipo })
                : p.ParameterType == typeof(string) ? "2026-000001"
                : p.ParameterType.IsValueType ? Activator.CreateInstance(p.ParameterType) : null)]);
        var nomes = acoes.SelectMany(t => new[] { "PUBLICA", "NOTA" }.Select(tipo => ((One.Api.Chamados.IAcaoChamado)Construir(t, tipo)).Acao)).ToHashSet();
        Assert.Equal(["assumir", "cancelar", "confirmar", "duplicado", "encaminhar", "nota", "reclassificar", "rejeitar", "resolver", "responder"], nomes.Order());
    }

    // ---- dominio-e-contratos S2: contratos nomeados ----

    static readonly System.Reflection.BindingFlags Declarados = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic
        | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.DeclaredOnly;

    static string CodigoDe(params string[] relativo) => SemComentarios(Path.Combine([Api, .. relativo]));

    // C13: objeto anônimo só nos 6 arquivos que o enunciado lista, e nenhum deles monta resposta HTTP (menos o de indicadores)
    [Fact]
    public void Objetos_anonimos_so_fora_das_respostas()
    {
        var anonimo = new Regex(@"\bnew\s*\{");
        var esperado = new Dictionary<string, int>
        {
            ["Agendador.cs"] = 1, ["Assistente/Assistente.cs"] = 8, ["Assistente/Embeddings.cs"] = 1,
            ["Conhecimento/Fontes.cs"] = 4, ["Indicadores/ConsultarIndicadores.cs"] = 2, ["Dados/OneDb.cs"] = 11,
        };
        var achados = CodigoApi().Select(p => (arquivo: Relativo(p), n: anonimo.Matches(SemComentarios(p)).Count)).Where(x => x.n > 0).ToDictionary(x => x.arquivo, x => x.n);
        Assert.Equal(esperado.OrderBy(x => x.Key), achados.OrderBy(x => x.Key));
        Assert.Equal(27, achados.Values.Sum());
        foreach (var arquivo in esperado.Keys.Except(["Indicadores/ConsultarIndicadores.cs"]))
            Assert.DoesNotMatch(@"\b(Typed)?Results\.", CodigoDe(arquivo.Split('/')));
        var indicadores = CodigoDe("Indicadores", "ConsultarIndicadores.cs");
        Assert.Equal(["Results.Ok"], Regex.Matches(indicadores, @"\b(Typed)?Results\.\w+").Select(m => m.Value));
        Assert.Contains("Results.Ok(CalculoIndicadores.Calcular(", indicadores);
        Assert.Equal(typeof(One.Api.Indicadores.Resultado), typeof(One.Api.Indicadores.CalculoIndicadores).GetMethod("Calcular")!.ReturnType);
    }

    static readonly string[] AsEntradas =
    [
        "Login", "PrimeiroAcesso", "DefinirSenha", "TrocarSenha", "CriarSetor", "AlterarSetor", "CriarCategoria", "AlterarCategoria", "CriarCurso", "AlterarCurso",
        "CriarRespostaPronta", "AlterarRespostaPronta", "SalvarRegra", "AlterarRegra", "CriarUsuario", "AlterarUsuario", "NovaConversa", "NovaMensagem",
        "AvaliarConversa", "TransferirConversa", "AtendimentoDireto", "ResolverChamado", "RejeitarChamado", "CancelarChamado", "EncaminharChamado",
        "ReclassificarChamado", "MarcarDuplicado", "CriarArtigo", "AlterarArtigo",
    ];

    static IEnumerable<Type> TiposDaApi() => typeof(Program).Assembly.GetTypes()
        .Where(t => t.Namespace is { } ns && ns.StartsWith("One.Api") && !ns.StartsWith("One.Api.Dados.Migracoes") && !t.Name.Contains('<'));

    // C14: door 1, o corpo JSON liga num Entrada aninhado na mensagem, um por caso de uso (29)
    [Fact]
    public void Entrada_por_caso_de_uso()
    {
        var topo = TiposDaApi().Where(t => !t.IsNested).ToList();
        Assert.DoesNotContain(topo, t => t.Name.EndsWith("In", StringComparison.Ordinal) || t.Name == "Entrada");
        var login = Assert.Single(topo, t => t.Name == "ResultadoLogin");
        var parametros = Assert.Single(login.GetConstructors()).GetParameters();
        Assert.Equal([typeof(System.Security.Claims.ClaimsPrincipal), typeof(IResult)], parametros.Select(p => p.ParameterType));
        Assert.Equal(["Principal", "Resposta"], parametros.Select(p => p.Name));

        var entradas = TiposDaApi().Where(t => t.IsNested && t.Name == "Entrada").ToList();
        Assert.Equal(29, entradas.Count);
        Assert.Equal(AsEntradas.Order(), entradas.Select(t => t.DeclaringType!.Name).Order());
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.All(entradas, t => Assert.Contains(t.DeclaringType!, mensagens));

        var endpoints = f.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>().ToList();
        var comCorpo = endpoints.Select(e => (e, corpo: e.Metadata.GetMetadata<Microsoft.AspNetCore.Http.Metadata.IAcceptsMetadata>()))
            .Where(x => x.corpo is not null && x.corpo.ContentTypes.Contains("application/json")).ToList();
        Assert.Equal(29, comCorpo.Count);
        var porNome = Comparer<Type>.Create((a, b) => string.CompareOrdinal(a.FullName, b.FullName));
        Assert.Equal(entradas.Order(porNome), comCorpo.Select(x => x.corpo!.RequestType!).Order(porNome));
        // o Entrada de cada rota é o da mensagem cujo Mapear registra aquela rota (verbo e caminho no arquivo do caso)
        foreach (var (e, corpo) in comCorpo)
        {
            var mensagem = corpo!.RequestType!.DeclaringType!;
            var mapa = Regex.Match(SemComentarios(ArquivoDo(mensagem)), @"\.Map(Get|Post|Put|Delete)\(\s*""([^""]+)""");
            Assert.True(mapa.Success, mensagem.Name);
            Assert.EndsWith(mapa.Groups[2].Value, e.RoutePattern.RawText);
            Assert.Equal(mapa.Groups[1].Value.ToUpperInvariant(), Assert.Single(e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods));
        }
    }

    static readonly string[] SemCorpoJson = ["DefinirSenha", "TrocarSenha", "BaixarAnexo", "BaixarVersaoDocumento"];

    static readonly string[] ComRespostaAninhada =
    [
        "Login", "PrimeiroAcesso", "Eu", "VerInstituicao", "NovaConversa", "NovaMensagem", "VerConversa", "AvaliarConversa", "TransferirConversa",
        "AtendimentoDireto", "EncerrarConversa", "ListarChamados", "RespostasProntasDoSetor", "VerVersaoArtigo", "ImportarMatriculas",
    ];

    static readonly string[] AsNoveAcoes =
        ["ResponderChamado", "AssumirChamado", "ResolverChamado", "ConfirmarChamado", "RejeitarChamado", "CancelarChamado", "EncaminharChamado", "ReclassificarChamado", "MarcarDuplicado"];

    // (fatia, record de Shared, os casos de uso que o citam)
    static readonly (string fatia, string record, string[] casos)[] OsNoveShared =
    [
        ("Chamados", "DetalheChamado", ["VerChamado", .. AsNoveAcoes]),
        ("Conhecimento", "ArtigoResposta", ["ListarArtigos", "CriarArtigo", "AlterarArtigo", "AtivarArtigo", "ArquivarArtigo"]),
        ("Conhecimento", "DocumentoResposta", ["ListarDocumentos", "CriarDocumento", "NovaVersaoDocumento", "ArquivarDocumento"]),
        ("Administracao", "UsuarioResposta", ["ListarUsuarios", "CriarUsuario", "AlterarUsuario", "DesativarUsuario"]),
        ("Administracao", "RegraResposta", ["ListarRegras", "SalvarRegra", "AlterarRegra"]),
        ("Administracao", "SetorResposta", ["ListarSetores", "CriarSetor", "AlterarSetor"]),
        ("Administracao", "CategoriaResposta", ["ListarCategorias", "CriarCategoria", "AlterarCategoria"]),
        ("Administracao", "CursoResposta", ["ListarCursos", "CriarCurso", "AlterarCurso"]),
        ("Administracao", "RespostaProntaResposta", ["ListarRespostasProntas", "CriarRespostaPronta", "AlterarRespostaPronta"]),
    ];

    // o texto onde o caso de uso cita a própria resposta: o arquivo dele ou, nas 9 ações, o do AgirNoChamado que as embrulha
    static string TextoDoCaso(Type mensagem) =>
        SemComentarios(typeof(One.Api.Chamados.IAcaoChamado).IsAssignableFrom(mensagem) ? Path.Combine(Api, "Chamados", "AgirNoChamado.cs") : ArquivoDo(mensagem));

    // C15: door 2, de onde vem o corpo JSON de cada uma das 54 mensagens que respondem com JSON
    [Fact]
    public void Resposta_por_caso_de_uso()
    {
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.Equal(58, mensagens.Count);
        var comJson = mensagens.Where(m => !SemCorpoJson.Contains(m.Name)).ToList();
        Assert.Equal(54, comJson.Count);

        var aninhadas = TiposDaApi().Where(t => t.IsNested && t.Name == "Resposta" && mensagens.Contains(t.DeclaringType!)).Select(t => t.DeclaringType!.Name).Order().ToList();
        Assert.Equal(ComRespostaAninhada.Order(), aninhadas);
        var doShared = OsNoveShared.SelectMany(x => x.casos.Select(c => (caso: c, x.record))).ToDictionary(x => x.caso, x => x.record);
        Assert.Equal(38, doShared.Count);

        foreach (var m in comJson)
        {
            if (m.Name == "ConsultarIndicadores")
            {
                Assert.Contains("Results.Ok(CalculoIndicadores.Calcular(", TextoDoCaso(m));
                Assert.DoesNotContain(m.Name, aninhadas);
            }
            else if (ComRespostaAninhada.Contains(m.Name))
                Assert.Contains(m.GetNestedTypes(), t => t.Name == "Resposta");
            else
            {
                Assert.True(doShared.TryGetValue(m.Name, out var nome), $"{m.Name}: sem Resposta aninhada nem record de Shared");
                Assert.Matches($@"\b{nome}\b", TextoDoCaso(m));
                Assert.DoesNotContain(m.Name, aninhadas);
            }
        }
        Assert.Equal(comJson.Count, ComRespostaAninhada.Length + doShared.Count + 1);
        Assert.All(SemCorpoJson, n => Assert.DoesNotContain(n, aninhadas.Concat(doShared.Keys)));

        // exatamente 9 arquivos em pastas Shared, cada um com 1 record de topo do nome do arquivo e o namespace da fatia
        var shared = CodigoApi().Where(p => Path.GetRelativePath(Api, p).Split(Path.DirectorySeparatorChar).Contains("Shared")).ToList();
        Assert.Equal(9, shared.Count);
        foreach (var arquivo in shared)
        {
            var nome = Path.GetFileNameWithoutExtension(arquivo);
            var fatia = Path.GetRelativePath(Api, arquivo).Split(Path.DirectorySeparatorChar)[0];
            var codigo = SemComentarios(arquivo);
            Assert.Equal([nome], TipoDeTopo.Matches(codigo).Select(m => m.Groups[1].Value));
            Assert.Matches($@"(?m)^public sealed record {nome}\b", codigo);
            Assert.Matches($@"(?m)^namespace One\.Api\.{fatia}\.Shared;", codigo);
            Assert.Equal(fatia, OsNoveShared.Single(x => x.record == nome).fatia);
        }
        Assert.Equal(OsNoveShared.Select(x => x.record).Order(), shared.Select(Path.GetFileNameWithoutExtension).Order());
    }

    // C16: cada record de Shared tem 3 ou mais usos, todos na fatia dele, e o nome não aparece em outra fatia
    [Fact]
    public void Shared_com_tres_usos_na_fatia()
    {
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        foreach (var (fatia, record, casos) in OsNoveShared)
        {
            var citam = mensagens.Where(m => m.Namespace == $"One.Api.{fatia}" && Regex.IsMatch(TextoDoCaso(m), $@"\b{record}\b")).Select(m => m.Name).Order().ToList();
            Assert.True(citam.Count >= 3, $"{record}: {citam.Count} usos");
            Assert.Equal(casos.Order(), citam);
            var fora = CodigoApi().Where(p => !Relativo(p).StartsWith(fatia + "/"));
            Assert.Empty(ArquivosQue(new Regex($@"\b{record}\b"), fora));
        }
    }

    // C17: door 1, nenhum campo, propriedade, parâmetro ou retorno tipado object (nem genérico com object); a transcrição é a única exceção
    static bool ComObject(Type t) =>
        t == typeof(object) || (t.HasElementType && ComObject(t.GetElementType()!)) || (t.IsGenericType && t.GetGenericArguments().Any(ComObject));

    static IEnumerable<(string onde, Type tipo)> Assinaturas(Type t) =>
        t.GetFields(Declarados).Select(x => ($"{t.FullName}.{x.Name}", x.FieldType))
            .Concat(t.GetProperties(Declarados).Select(x => ($"{t.FullName}.{x.Name}", x.PropertyType)))
            .Concat(t.GetMethods(Declarados).Where(m => m.GetBaseDefinition().DeclaringType != typeof(object)).SelectMany(m => m.GetParameters().Select(p => ($"{t.FullName}.{m.Name}({p.Name})", p.ParameterType)).Append(($"{t.FullName}.{m.Name}()", m.ReturnType))))
            .Concat(t.GetConstructors(Declarados).SelectMany(c => c.GetParameters().Select(p => ($"{t.FullName}.ctor({p.Name})", p.ParameterType))));

    [Fact]
    public void Nenhum_corpo_tipado_object()
    {
        var detalhe = typeof(One.Api.Chamados.Shared.DetalheChamado);
        var itens = typeof(IReadOnlyList<object>);
        var tipos = typeof(Program).Assembly.GetTypes()
            .Where(t => t.Namespace is { } ns && ns.StartsWith("One.Api") && !ns.StartsWith("One.Api.Dados.Migracoes") && t.FullName != "One.Api.Assistente.Assistente"
                && !t.IsDefined(typeof(System.Runtime.CompilerServices.CompilerGeneratedAttribute), false) && !t.Name.Contains('<'));
        var com = tipos.SelectMany(Assinaturas).Where(x => ComObject(x.tipo)).ToList();
        // a exceção: a transcrição do detalhe (propriedade, parâmetro do construtor e do Deconstruct), onde o item da equipe e o do aluno são records nomeados
        var restante = com.Where(x => !(x.onde.StartsWith(detalhe.FullName + ".") && x.onde.Contains("Transcricao") && (x.tipo == itens || x.tipo.GetElementType() == itens))).ToList();
        Assert.Empty(restante);
        Assert.Equal(itens, detalhe.GetProperty("Transcricao")!.PropertyType);
        Assert.Single(detalhe.GetProperties(Declarados), p => ComObject(p.PropertyType));
        var equipe = detalhe.GetNestedType("TranscricaoDaEquipe")!;
        var aluno = detalhe.GetNestedType("TranscricaoDoAluno")!;
        Assert.NotNull(equipe.GetProperty("Fontes"));
        Assert.Null(aluno.GetProperty("Fontes"));
        Assert.Equal(["Autor", "Texto", "CriadaEm"], aluno.GetProperties().Select(p => p.Name));
    }

    // C26: door 4, o pipeline do chamado tem a forma da base; só o DetalheChamado.Montar e a Recusa são do domínio-e-contratos
    [Fact]
    public void Pipeline_do_chamado_com_a_forma_da_base()
    {
        string[] Publicos(Type t) => [.. t.GetMembers(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.DeclaredOnly)
            .Where(m => m is not System.Reflection.ConstructorInfo && !(m is System.Reflection.MethodInfo { IsSpecialName: true })).Select(m => m.Name).Order()];

        var permissoes = typeof(One.Api.Chamados.PermissoesChamado);
        Assert.Equal(["Acoes", "Aluno", "Atendente", "Estados"], Publicos(permissoes));
        Assert.Equal(typeof(string[]), permissoes.GetMethod("Estados")!.ReturnType);
        Assert.Equal([typeof(string), typeof(string)], permissoes.GetMethod("Estados")!.GetParameters().Select(p => p.ParameterType));
        Assert.Equal(typeof(IEnumerable<string>), permissoes.GetMethod("Acoes")!.ReturnType);
        Assert.Equal([typeof(string), typeof(string), typeof(long?), typeof(long)], permissoes.GetMethod("Acoes")!.GetParameters().Select(p => p.ParameterType));

        var acesso = typeof(One.Api.Chamados.AcessoChamado);
        Assert.Equal(["Agora", "Cfg", "Chamado", "Instituicao", "Papel", "Prazos", "Preencher", "Usuario"], Publicos(acesso));
        Assert.All(acesso.GetProperties(), p => Assert.False(p.SetMethod is { IsPublic: true }, p.Name));
        var preencher = acesso.GetMethod("Preencher")!;
        Assert.Equal(typeof(void), preencher.ReturnType);
        Assert.Equal([typeof(Chamado), typeof(string), typeof(Usuario), typeof(Instituicao), typeof(DateTime), typeof(Microsoft.Extensions.Configuration.IConfiguration), typeof(Prazos)],
            preencher.GetParameters().Select(p => p.ParameterType));

        var acao = typeof(One.Api.Chamados.IAcaoChamado);
        Assert.Equal(["Acao", "Criado", "Instituicao", "Numero", "Usuario", "Validar"], Publicos(acao));
        var validar = acao.GetMethod("Validar")!;
        Assert.Equal(typeof(ValueTask<IResult?>), validar.ReturnType);
        Assert.Equal([typeof(One.Api.Chamados.AcessoChamado), typeof(OneDb)], validar.GetParameters().Select(p => p.ParameterType));

        var agir = typeof(One.Api.Chamados.AgirNoChamado<,>);
        Assert.Equal(["Handle"], Publicos(agir));
        Assert.Equal([typeof(OneDb), typeof(One.Api.Chamados.AcessoChamado), typeof(TimeProvider), typeof(Prazos), typeof(Microsoft.Extensions.Configuration.IConfiguration)],
            Assert.Single(agir.GetConstructors()).GetParameters().Select(p => p.ParameterType));
        var handle = agir.GetMethod("Handle")!;
        Assert.Equal(typeof(ValueTask<>), handle.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(agir.GetGenericArguments()[1], handle.ReturnType.GetGenericArguments()[0]);
        Assert.Equal(typeof(CancellationToken), handle.GetParameters()[2].ParameterType);
        Assert.Equal(agir.GetGenericArguments()[0], handle.GetParameters()[0].ParameterType);

        Assert.Equal(typeof(Task<One.Api.Chamados.Shared.DetalheChamado>), typeof(One.Api.Chamados.Shared.DetalheChamado).GetMethod("Montar")!.ReturnType);

        var recusa = CodigoDe("Dados", "Recusa.cs");
        Assert.Contains("namespace One.Api.Dados;", recusa);
        Assert.Contains("public sealed record Recusa(string Motivo);", recusa);
        foreach (var (tipo, metodo) in new[] { (typeof(Chamado), "Assumir"), (typeof(Chamado), "Rejeitar"), (typeof(Artigo), "Ativar"), (typeof(Artigo), "Arquivar"), (typeof(Documento), "NovaVersao"), (typeof(Documento), "Arquivar") })
            Assert.Equal(typeof(Recusa), tipo.GetMethod(metodo)!.ReturnType);

        var sep = Path.DirectorySeparatorChar;
        var chamam = CodigoApi().Where(p => !p.EndsWith($"{sep}Chamados{sep}PermissoesChamado.cs")).Where(p => Regex.IsMatch(SemComentarios(p), @"\bEstados\(")).Select(Relativo);
        Assert.Equal(["Chamados/AgirNoChamado.cs"], chamam);
    }
}
