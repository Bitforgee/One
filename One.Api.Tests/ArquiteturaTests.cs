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
        "usuario", "usuario_papel", "setor", "atendente_setor", "curso", "matricula", "categoria", "fluxo", "versao_fluxo", "etapa_fluxo",
        "artigo", "versao_artigo", "token_acesso", "conversa", "mensagem_conversa", "citacao_artigo", "chamado",
        "mensagem_chamado", "anexo", "anexo_conversa", "evento_chamado", "resposta_pronta", "email_saida",
        "documento", "versao_documento", "trecho_fonte", "subscricao_push", "push_saida", "imagem_instituicao", "plataforma_moodle", "vinculo_moodle", "lti_lancamento", "token_mcp",
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

        var univag = await f.Instituicao();
        var demo = await f.Instituicao();
        Assert.Empty(await f.Db(demo.Id, db => db.Setores.Where(s => s.InstituicaoId == univag.Id).ToListAsync()));
        Assert.Single(await f.Db(univag.Id, db => db.Setores.ToListAsync()));
    }

    [Fact]
    public void IgnoreQueryFilters_so_no_agendador_e_no_comando()
    {
        var api = Path.Combine(Raiz(), "One.Api");
        var permitidos = new[] { Path.Combine(api, "Acesso", "ApagarLancamentos.cs"), Path.Combine(api, "Assistente", "AbandonarConversas.cs"), Path.Combine(api, "Chamados", "FecharResolvidos.cs"), Path.Combine(api, "Chamados", "ResolverSemResposta.cs"), Path.Combine(api, "Chamados", "LembrarAguardando.cs"), Path.Combine(api, "Chamados", "SubirPorPrazo.cs"), Path.Combine(api, "Chamados", "EnviarEmails.cs"), Path.Combine(api, "Chamados", "EnviarPushes.cs"), Path.Combine(api, "Assistente", "IndexarTrechos.cs") };
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
        Assert.Matches(new Regex(@"^\s+image:\s*pgvector/pgvector:0\.8\.7-pg18-trixie\s*$", RegexOptions.Multiline), compose);
        Assert.Matches(new Regex(@"^\s+image:\s*axllent/mailpit\s*$", RegexOptions.Multiline), compose);

        var solucao = File.ReadAllText(Path.Combine(raiz, "One.slnx"));
        Assert.Contains("One.Api/One.Api.csproj", solucao);
        Assert.Contains("One.Api.Tests/One.Api.Tests.csproj", solucao);
        Assert.Contains("web/package.json", solucao);
        Assert.True(File.Exists(Path.Combine(raiz, "web", "package.json")));
        Assert.True(File.Exists(Path.Combine(raiz, "One.Api", "One.Api.csproj")));
        Assert.True(File.Exists(Path.Combine(raiz, "One.Api.Tests", "One.Api.Tests.csproj")));
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

    static string Api => Path.Combine(Raiz(), "One.Api");

    static IEnumerable<string> CodigoApi()
    {
        var sep = Path.DirectorySeparatorChar;
        return Directory.EnumerateFiles(Api, "*.cs", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{sep}bin{sep}") && !p.Contains($"{sep}obj{sep}") && !p.Contains($"{sep}Dados{sep}Migracoes{sep}"));
    }

    static string Relativo(string p) => Path.GetRelativePath(Api, p).Replace('\\', '/');

    static string SemComentarios(string p) => Regex.Replace(File.ReadAllText(p), @"(?m)(?<![:""/])//.*$", "");

    static List<string> ArquivosQue(Regex padrao, IEnumerable<string>? arquivos = null) =>
        (arquivos ?? CodigoApi()).Where(p => padrao.IsMatch(SemComentarios(p))).Select(Relativo).Order().ToList();

    static readonly Dictionary<Type, string[]> LiteraisGravados = new()
    {
        [typeof(TiposEvento)] = ["CRIACAO", "TRANSICAO", "ATRIBUICAO", "LEMBRETE", "NOTA", "RESPOSTA", "ANEXO", "ENCAMINHAMENTO", "RECLASSIFICACAO", "SUBIDA"],
        [typeof(DestinosEtapa)] = ["SETOR", "COORDENACAO_CURSO", "LIDERANCA_SEMESTRE"],
        [typeof(TiposMensagem)] = ["PUBLICA", "NOTA"],
        [typeof(MotivosFechamento)] = ["CONFIRMADO", "CANCELADO", "DUPLICADO", "FECHADO_AUTOMATICAMENTE"],
    };

    static readonly Dictionary<Type, string> ArquivoDoVocabulario = new()
    {
        [typeof(TiposEvento)] = "Dados/Chamados/TiposEvento.cs",
        [typeof(DestinosEtapa)] = "Dados/Fluxos/DestinosEtapa.cs",
        [typeof(TiposMensagem)] = "Dados/Chamados/TiposMensagem.cs",
        [typeof(MotivosFechamento)] = "Dados/Chamados/MotivosFechamento.cs",
    };

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
            Assert.Equal(LiteraisGravados.Where(g => g.Value.Contains(literal)).Select(g => ArquivoDoVocabulario[g.Key]).Order(), ArquivosQue(new Regex($"\"{literal}\"")));
    }

    [Fact]
    public void Ultima_versao_em_um_arquivo()
    {
        var arquivos = ArquivosQue(new Regex(@"(OrderByDescending|MaxAsync|Max)\(\s*(\w+)\s*=>\s*\2\.Numero\s*\)"));
        Assert.Single(arquivos);
        Assert.StartsWith("Conhecimento/", arquivos[0]);
    }

    [Fact]
    public void Artigo_ou_documento_em_um_arquivo()
    {
        var sep = Path.DirectorySeparatorChar;
        var arquivos = ArquivosQue(new Regex(@"(VersaoArtigoId|VersaoDocumentoId)\s*(==\s*null|!=\s*null|is\s*\{|is\s+null|is\s+not\s+null)"),
            CodigoApi().Where(p => !p.Contains($"{sep}Dados{sep}")));
        Assert.Single(arquivos);
        Assert.StartsWith("Conhecimento/", arquivos[0]);
    }

    [Fact]
    public void Configuracao_lida_em_um_lugar()
    {
        int Leituras(string chave) => CodigoApi().Sum(p => Regex.Matches(File.ReadAllText(p), Regex.Escape($"\"{chave}\"")).Count);
        foreach (var chave in new[] { "Llm:BaseUrl", "Llm:ChaveApi", "App:UrlBase" })
            Assert.True(Leituras(chave) == 1, $"{chave} lida {Leituras(chave)} vezes");
        var program = File.ReadAllText(Path.Combine(Api, "Assistente", "AssistenteExtensoes.cs"));
        var metodo = Regex.Match(program, @"AddHttpClient\(""llm"", (\w+)\)").Groups[1].Value;
        Assert.NotEqual("", metodo);
        var registro = Regex.Match(program, $@"static void {metodo}\(IServiceProvider \w+, HttpClient \w+\)\s*\{{.*?\n    \}}", RegexOptions.Singleline).Value;
        Assert.Contains("\"Llm:BaseUrl\"", registro);
        Assert.Contains("\"Llm:ChaveApi\"", registro);
    }

    [Fact]
    public void Assinatura_de_arquivo_em_um_lugar() =>
        Assert.Single(ArquivosQue(new Regex(@"0x25,\s*0x50,\s*0x44,\s*0x46")));

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

    [Fact]
    public void Testes_de_regra_sem_banco()
    {
        foreach (var classe in new[] { "PermissoesChamadoTests", "IndicadoresCalculoTests", "CargaValidacaoTests", "CsvMatriculasTests", "PerguntaTests" })
        {
            var texto = File.ReadAllText(Path.Combine(Raiz(), "One.Api.Tests", classe + ".cs"));
            Assert.Contains($"public class {classe}", texto);
            foreach (var proibido in new[] { "OneFactory", "OneDb", "HttpClient" })
                Assert.False(texto.Contains(proibido), $"{classe} usa {proibido}");
        }
    }

    [Fact]
    public void Sem_DateTime_Now() =>
        Assert.Empty(ArquivosQue(new Regex(@"DateTime\.(UtcNow|Now)\b")));

    [Fact]
    public void Glossario_lista_os_termos()
    {
        var linhas = File.ReadAllLines(Path.Combine(Raiz(), ".specs", "GLOSSARIO.md")).Where(l => l.StartsWith('|')).ToList();
        static string Significado(string linha) => linha.Trim().Trim('|').Split('|')[^1].Trim();
        var grupos = new Dictionary<Type, string>
        {
            [typeof(TiposEvento)] = "tipo de evento",
            [typeof(DestinosEtapa)] = "tipo de destino",
            [typeof(TiposMensagem)] = "tipo de mensagem",
            [typeof(MotivosFechamento)] = "motivo de fechamento",
        };
        foreach (var (tipo, literais) in LiteraisGravados)
            foreach (var literal in literais)
                Assert.True(linhas.Any(l => l.Contains($"`{literal}`") && l.Contains(grupos[tipo]) && Significado(l).Length >= 10), $"{literal} ({grupos[tipo]})");
        foreach (var termo in new[] { "Fluxo", "Abrangência", "Etapa", "Liderança", "Subir", "SUBIDA" })
            Assert.True(linhas.Any(l => l.TrimStart('|', ' ').StartsWith($"`{termo}`") && Significado(l).Length >= 10), termo);
        foreach (var (prazo, chave, padrao) in new[]
        {
            ("abandono", "Prazos:AbandonoMinutos", "30 min"), ("confirmação", "Prazos:ConfirmacaoDias", "7 dias"), ("rejeição", "Prazos:ConfirmacaoDias", "7 dias"),
            ("lembrete", "Prazos:LembreteAguardandoDias", "3 dias"), ("resolver aguardando", "Prazos:ResolverAguardandoDias", "7 dias"),
        })
            Assert.True(linhas.Any(l => l.Contains($"prazo de {prazo}") && l.Contains($"`{chave}`") && l.Contains(padrao) && Significado(l).Length >= 10), prazo);
    }

    [Fact]
    public void Barreira_de_complexidade_configurada()
    {
        Assert.Contains("CA1502(Method): 10", File.ReadAllLines(Path.Combine(Api, "CodeMetricsConfig.txt")).Select(l => l.Trim()));
        var projeto = System.Xml.Linq.XDocument.Load(Path.Combine(Api, "One.Api.csproj"));
        Assert.Contains(projeto.Descendants("AdditionalFiles"), e => (string?)e.Attribute("Include") == "CodeMetricsConfig.txt");
        Assert.Contains(projeto.Descendants("WarningsAsErrors"), e => e.Value.Split(';').Select(x => x.Trim()).Contains("CA1502"));
        Assert.Matches(@"(?m)^\s*dotnet_diagnostic\.CA1502\.severity\s*=\s*warning\s*$", File.ReadAllText(Path.Combine(Raiz(), ".editorconfig")));
    }

    static readonly string[] Fatias = ["Acesso", "Assistente", "Chamados", "Conhecimento", "Indicadores", "Administracao", "Instituicoes", "Mcp"];

    static IEnumerable<string> DaPasta(string pasta) => Directory.EnumerateFiles(Path.Combine(Api, pasta), "*.cs", SearchOption.AllDirectories);

    [Fact]
    public void Chamados_nao_consulta_versoes() =>
        Assert.Empty(ArquivosQue(new Regex(@"\bVersoes(Artigo|Documento)\b"), DaPasta("Chamados")));

    [Fact]
    public void Fatias_do_api()
    {
        var pastas = Directory.GetDirectories(Api).Select(Path.GetFileName).Except(["bin", "obj", "Properties", "wwwroot"]).Order();
        Assert.Equal([.. Fatias.Append("Dados").Order()], pastas);
        Assert.False(Directory.Exists(Path.Combine(Api, "Rotas")));
        Assert.False(Directory.Exists(Path.Combine(Api, "Comando")));
        Assert.Equal(["Agendador", "Armazenamento", "Arquivos", "EnviadorSmtp", "EquipeDeSetor", "GrupoAdministrador", "LayoutEmail", "Persistencia", "Prazos", "Problemas", "Program", "ResultadoComTamanho", "Seguranca", "Sessao", "Tokens", "TratamentoDeErros"],
            Directory.GetFiles(Api, "*.cs").Select(Path.GetFileNameWithoutExtension).Order());
    }

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

    static readonly (string de, string para)[] ReferenciasEntreFatias =
    [
        ("Administracao", "Acesso"), ("Administracao", "Chamados"),
        ("Assistente", "Chamados"), ("Assistente", "Conhecimento"),
        ("Chamados", "Conhecimento"),
        ("Indicadores", "Conhecimento"),
        ("Mcp", "Assistente"), ("Mcp", "Chamados"), ("Mcp", "Conhecimento"), ("Mcp", "Indicadores"),
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

    [Fact]
    public void Importacao_em_arquivo_proprio()
    {
        var arquivo = Assert.Single(DaPasta("Administracao"), p => File.ReadAllText(p).Contains("\"/matriculas/importacao\""));
        Assert.Single(Regex.Matches(SemComentarios(arquivo), @"\.Map\w*\("));
    }

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

    public static List<(Type mensagem, Type resposta)> Mensagens() =>
        typeof(Program).Assembly.GetTypes().Where(Concreto)
            .Select(t => (t, Fechado(t, typeof(Mediator.IRequest<>))))
            .Where(x => x.Item2 is not null)
            .Select(x => (x.t, x.Item2!.GetGenericArguments()[0])).ToList();

    static string ArquivoDo(Type t) => Path.Combine(Api, t.Namespace!["One.Api.".Length..], t.Name + ".cs");

    [Fact]
    public void Um_arquivo_por_caso_de_uso()
    {
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.Equal(87, mensagens.Count);
        var porFatia = new Dictionary<string, int> { ["Acesso"] = 9, ["Assistente"] = 9, ["Chamados"] = 17, ["Conhecimento"] = 11, ["Indicadores"] = 1, ["Administracao"] = 28, ["Instituicoes"] = 12 };
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

    [Fact]
    public void Um_handler_por_mensagem_no_mesmo_arquivo()
    {
        var handlers = typeof(Program).Assembly.GetTypes().Where(Concreto)
            .Select(t => (handler: t, contrato: Fechado(t, typeof(Mediator.IRequestHandler<,>)))).Where(x => x.contrato is not null).ToList();
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.Equal(87, handlers.Count);
        Assert.Equal(mensagens.Order(Comparer<Type>.Create((a, b) => string.CompareOrdinal(a.FullName, b.FullName))),
            handlers.Select(h => h.contrato!.GetGenericArguments()[0]).Order(Comparer<Type>.Create((a, b) => string.CompareOrdinal(a.FullName, b.FullName))));
        foreach (var (handler, contrato) in handlers)
        {
            var mensagem = contrato!.GetGenericArguments()[0];
            Assert.Equal(mensagem.Name + "Handler", handler.Name);
            Assert.Matches($@"\bclass\s+{handler.Name}\b", SemComentarios(ArquivoDo(mensagem)));
        }
    }

    [Fact]
    public void Pacote_mcp_fixado()
    {
        var projeto = System.Xml.Linq.XDocument.Load(Path.Combine(Api, "One.Api.csproj"));
        var mcp = Assert.Single(projeto.Descendants("PackageReference"), p => (string?)p.Attribute("Include") == "ModelContextProtocol.AspNetCore");
        Assert.Equal("2.4.0", (string?)mcp.Attribute("Version"));
        var programa = SemComentarios(Path.Combine(Api, "Mcp", "McpExtensoes.cs"));
        Assert.Contains("HttpServerSessionMode.Stateless", programa);
        Assert.Contains("WithTools<FerramentasMcp>", programa);
    }
    [Fact]
    public void Pacote_jwt_fixado()
    {
        var projeto = System.Xml.Linq.XDocument.Load(Path.Combine(Api, "One.Api.csproj"));
        var jwt = Assert.Single(projeto.Descendants("PackageReference"), p => (string?)p.Attribute("Include") == "Microsoft.IdentityModel.JsonWebTokens");
        Assert.Matches(@"^\d+\.\d+\.\d+$", (string?)jwt.Attribute("Version") ?? "");
    }

    [Fact]
    public void Map_so_nos_casos_de_uso()
    {
        var map = new Regex(@"\.(MapGet|MapPost|MapPut|MapDelete|MapPatch|MapMethods|MapFallback\w*)\(");
        var porArquivo = CodigoApi().Select(p => (arquivo: Relativo(p), maps: map.Matches(SemComentarios(p)).Select(m => m.Value).ToList()))
            .Where(x => x.maps.Count > 0).ToDictionary(x => x.arquivo, x => x.maps);
        var casos = Mensagens().Select(m => Relativo(ArquivoDo(m.mensagem))).ToHashSet();

        Assert.Equal(90, porArquivo.Values.Sum(m => m.Count));
        foreach (var caso in casos)
            Assert.True(porArquivo.GetValueOrDefault(caso)?.Count == 1, $"{caso}: {porArquivo.GetValueOrDefault(caso)?.Count ?? 0} Map*");
        Assert.Equal([".MapFallback(", ".MapFallbackToFile("], porArquivo["Program.cs"].Order());
        var resto = Assert.Single(porArquivo.Keys.Except(casos).Except(["Program.cs"]));
        Assert.Single(porArquivo[resto]);
        Assert.Matches(new Regex(@"\.MapPost\(""/auth/logout"""), SemComentarios(Path.Combine(Api, resto)));
    }

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

    [Fact]
    public void Handler_sem_HttpContext()
    {
        var proibidos = new[] { typeof(HttpContext), typeof(HttpRequest), typeof(IHttpContextAccessor) };
        foreach (var (mensagem, _) in Mensagens())
            Assert.All(mensagem.GetProperties(), p => Assert.DoesNotContain(p.PropertyType, proibidos));
        var handlers = typeof(Program).Assembly.GetTypes().Where(Concreto).Where(t => Fechado(t, typeof(Mediator.IRequestHandler<,>)) is not null).ToList();
        Assert.Equal(87, handlers.Count);
        foreach (var t in handlers.Append(typeof(One.Api.Chamados.AgirNoChamado<,>)))
            foreach (var c in t.GetConstructors())
                Assert.All(c.GetParameters(), p => Assert.DoesNotContain(p.ParameterType, proibidos));
        var montar = Assert.Single(typeof(One.Api.Chamados.Shared.DetalheChamado).GetMethods(), m => m.Name == "Montar");
        Assert.DoesNotContain(typeof(HttpContext), montar.GetParameters().Select(p => p.ParameterType));
        Assert.Empty(ArquivosQue(new Regex("IHttpContextAccessor")));
    }

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

    [Fact]
    public void Chamado_fechado()
    {
        AgregadoFechado(typeof(Chamado), "Mensagens", typeof(MensagemChamado));
        Assert.Equal(typeof(IReadOnlyCollection<EventoChamado>), typeof(Chamado).GetProperty("Eventos")!.PropertyType);
        Assert.False(typeof(Chamado).GetProperty("Xmin")!.SetMethod is { IsPublic: true });
        foreach (var filho in new[] { typeof(MensagemChamado), typeof(Anexo), typeof(EventoChamado) }) FilhoAppendOnly(filho);
        SemPersistenciaNoArquivo("Chamados/Chamado.cs");
    }

    [Fact]
    public void Chamado_muda_so_pelos_metodos()
    {
        var sep = Path.DirectorySeparatorChar;
        var fora = CodigoApi().Where(p => !p.Contains($"{sep}Dados{sep}"));
        Assert.Empty(ArquivosQue(new Regex(@"new\s+(EventoChamado|MensagemChamado)\b|\b(EventosChamado|MensagensChamado)\.Add"), fora));
    }

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
        [""] = ["Instituicao", "ImagemInstituicao"],
        ["Chamados"] = ["Chamado", "MensagemChamado", "Anexo", "EventoChamado"],
        ["Conversas"] = ["Conversa", "MensagemConversa", "CitacaoArtigo", "AnexoConversa"],
        ["Artigos"] = ["Artigo", "VersaoArtigo"],
        ["Documentos"] = ["Documento", "VersaoDocumento"],
        ["Trechos"] = ["TrechoFonte"],
        ["Usuarios"] = ["Usuario", "UsuarioPapel", "Matricula", "TokenAcesso", "AtendenteSetor"],
        ["Cadastros"] = ["Setor", "Curso", "Categoria", "RespostaPronta"],
        ["Fluxos"] = ["Fluxo", "VersaoFluxo", "EtapaFluxo"],
        ["Emails"] = ["EmailSaida"],
        ["Push"] = ["SubscricaoPush", "PushSaida"],
        ["Moodle"] = ["PlataformaMoodle", "VinculoMoodle", "LtiLancamento"],
        ["Mcp"] = ["TokenMcp"],
    };

    static readonly Regex TipoDeTopo = new(@"(?m)^(?:public |internal )?(?:static |sealed |abstract |partial )*(?:class|record|struct|interface|enum)\s+(\w+)");

    [Fact]
    public async Task Uma_entidade_por_arquivo_por_agregado()
    {
        var modelo = await f.Db(null, db => Task.FromResult(db.Model));
        var tipos = modelo.GetEntityTypes().Select(e => e.ClrType).ToList();
        Assert.Equal(34, tipos.Count);
        Assert.Equal(EntidadesPorPasta.Values.SelectMany(n => n).Order(), tipos.Select(t => t.Name).Order());
        foreach (var (pasta, nomes) in EntidadesPorPasta)
            foreach (var nome in nomes)
            {
                var arquivo = Path.Combine(Api, "Dados", pasta, nome + ".cs");
                Assert.True(File.Exists(arquivo), $"falta Dados/{pasta}/{nome}.cs");
                Assert.Equal([nome], TipoDeTopo.Matches(SemComentarios(arquivo)).Select(m => m.Groups[1].Value));
                Assert.Equal(pasta == "" ? "One.Api.Dados" : $"One.Api.Dados.{pasta}", tipos.Single(t => t.Name == nome).Namespace);
            }
        Assert.Equal(new[] { "IDaInstituicao" }.Order(),
            TipoDeTopo.Matches(SemComentarios(Path.Combine(Api, "Dados", "Entidades.cs"))).Select(m => m.Groups[1].Value).Order());
        foreach (var projeto in new[] { Path.Combine(Api, "One.Api.csproj"), Path.Combine(Raiz(), "One.Api.Tests", "One.Api.Tests.csproj") })
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

    [Fact]
    public void Testes_de_dominio_sem_banco()
    {
        var publicos = new Dictionary<Type, string[]>
        {
            [typeof(Chamado)] = ["Abrir", "Assumir", "ResponderComoAluno", "ResponderComoEquipe", "Anotar", "Resolver", "Confirmar", "Rejeitar", "Cancelar", "Encaminhar", "Subir", "Reclassificar", "MarcarDuplicado", "DevolverAFila", "LembrarAluno", "ResolverPorFaltaDeResposta", "FecharPorInatividade"],
            [typeof(Artigo)] = ["Criar", "NovaVersao", "Ativar", "Arquivar"],
            [typeof(Documento)] = ["Criar", "NovaVersao", "Arquivar"],
        };
        foreach (var (entidade, metodos) in publicos)
        {
            var classe = entidade.Name + "DominioTests";
            var texto = string.Concat(Directory.GetFiles(Path.Combine(Raiz(), "One.Api.Tests"), entidade.Name + "*DominioTests.cs").Select(File.ReadAllText));
            Assert.Contains($"public class {classe}", texto);
            foreach (var proibido in new[] { "OneFactory", "OneDb", "HttpClient" })
                Assert.False(texto.Contains(proibido), $"{classe} usa {proibido}");
            var declarados = entidade.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static
                | System.Reflection.BindingFlags.DeclaredOnly).Where(m => !m.IsSpecialName).Select(m => m.Name);
            Assert.Equal(metodos.Order(), declarados.Order());
            foreach (var metodo in metodos) Assert.Contains($".{metodo}(", texto);
        }
    }

    [Fact]
    public async Task Modelo_sem_mudanca_pendente()
    {
        Assert.False(await f.Db(null, db => Task.FromResult(db.Database.HasPendingModelChanges())));
        foreach (var migracao in Directory.GetFiles(Path.Combine(Api, "Dados", "Migracoes"), "*DominioRico.cs"))
            Assert.DoesNotContain("migrationBuilder.", SemComentarios(migracao));
    }

    [Fact]
    public void Dois_projetos_sem_repositorio()
    {
        var projetos = Regex.Matches(File.ReadAllText(Path.Combine(Raiz(), "One.slnx")), "<Project Path=\"([^\"]+)\"").Select(m => m.Groups[1].Value);
        Assert.Equal(["One.Api.Tests/One.Api.Tests.csproj", "One.Api/One.Api.csproj"], projetos.Order(StringComparer.Ordinal));
        IEnumerable<string> Csproj(string pasta) => Directory.GetFiles(pasta, "*.csproj").Concat(Directory.GetDirectories(pasta)
            .Where(d => Path.GetFileName(d) is not ("bin" or "obj" or "node_modules" or ".git" or "target")).SelectMany(Csproj));
        Assert.Equal(2, Csproj(Raiz()).Count());
        Assert.DoesNotContain(typeof(Program).Assembly.GetTypes(), t => t.Name.Contains("Repositor"));
    }

    [Fact]
    public void Dez_acoes_do_chamado()
    {
        var acoes = typeof(Program).Assembly.GetTypes().Where(Concreto).Where(t => typeof(One.Api.Chamados.IAcaoChamado).IsAssignableFrom(t)).ToList();
        Assert.Equal(10, acoes.Count);
        Assert.All(acoes, t => Assert.True(File.Exists(Path.Combine(Api, "Chamados", t.Name + ".cs")) && t.Namespace == "One.Api.Chamados", t.Name));

        object Construir(Type t, string tipo) =>
            Assert.Single(t.GetConstructors()).Invoke([.. Assert.Single(t.GetConstructors()).GetParameters().Select(p =>
                p.ParameterType == typeof(IFormCollection) ? new FormCollection(new() { ["tipo"] = tipo })
                : p.ParameterType == typeof(string) ? "2026-000001"
                : p.ParameterType.IsValueType ? Activator.CreateInstance(p.ParameterType) : null)]);
        var nomes = acoes.SelectMany(t => new[] { "PUBLICA", "NOTA" }.Select(tipo => ((One.Api.Chamados.IAcaoChamado)Construir(t, tipo)).Acao)).ToHashSet();
        Assert.Equal(["assumir", "cancelar", "confirmar", "duplicado", "encaminhar", "nota", "reclassificar", "rejeitar", "resolver", "responder", "subir"], nomes.Order());
        Assert.All(nomes, n => Assert.True(new[] { "ALUNO", "ATENDENTE", "LIDER" }.Any(p => One.Api.Chamados.PermissoesChamado.Estados(n, p) is not null), n));
        Assert.Equal(["assumir", "nota", "resolver", "responder", "subir"], nomes.Where(n => One.Api.Chamados.PermissoesChamado.Estados(n, "LIDER") is not null).Order());
    }

    [Fact]
    public async Task Visao_e_ciencia_fora_do_banco_e_da_entrada()
    {
        Assert.Equal(["COORDENACAO_CURSO", "LIDERANCA_SEMESTRE", "SETOR"], DestinosEtapa.Todos.Order(StringComparer.Ordinal));
        var proibido = new Regex("visao|aceit|exige|restrit", RegexOptions.IgnoreCase);
        var colunas = await f.Db(null, db => Task.FromResult(new[] { typeof(One.Api.Dados.Fluxos.Fluxo), typeof(One.Api.Dados.Fluxos.VersaoFluxo), typeof(One.Api.Dados.Fluxos.EtapaFluxo) }
            .SelectMany(e => db.Model.FindEntityType(e)!.GetProperties().Select(p => p.Name)).ToList()));
        Assert.NotEmpty(colunas);
        Assert.DoesNotContain(colunas, proibido.IsMatch);
        foreach (var entrada in new[] { typeof(One.Api.Administracao.SalvarRascunho.EtapaEntrada), typeof(One.Api.Administracao.SalvarRascunho.Entrada), typeof(One.Api.Administracao.CriarFluxo.Entrada) })
            Assert.DoesNotContain(entrada.GetProperties(), p => proibido.IsMatch(p.Name));
    }

    [Fact]
    public void Setor_so_pelo_ResolverFluxo()
    {
        Assert.Equal(["Dados/Fluxos/Fluxo.cs", "Dados/Fluxos/RoteamentoDeFluxo.cs"], ArquivosQue(new Regex(@"\.Destino\s*(==|!=|\bis\b|switch\b)")));
        foreach (var usa in new[] { "Chamados/AbrirChamado.cs", "Chamados/SubirChamado.cs", "Administracao/SimularFluxo.cs", "Chamados/SubirPorPrazo.cs" })
        {
            var codigo = CodigoDe(usa.Split('/'));
            Assert.Matches(@"(ConsultasDeFluxo|RoteamentoDeFluxo)\.(Rotear|Seguinte|Proximo)\(", codigo);
            Assert.DoesNotMatch(@"SetorCoordenacaoId|DestinosEtapa\.", codigo);
        }
    }

    static readonly System.Reflection.BindingFlags Declarados = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic
        | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.DeclaredOnly;

    static string CodigoDe(params string[] relativo) => SemComentarios(Path.Combine([Api, .. relativo]));

    [Fact]
    public void Objetos_anonimos_so_fora_das_respostas()
    {
        var anonimo = new Regex(@"\bnew\s*\{");
        var esperado = new Dictionary<string, int>
        {
            ["Assistente/IndexarTrechos.cs"] = 1,
            ["Conhecimento/BuscarFontes.cs"] = 2, ["Conhecimento/CitacoesDeFontes.cs"] = 2, ["Dados/OneDb.cs"] = 15,
        };
        var achados = CodigoApi().Select(p => (arquivo: Relativo(p), n: anonimo.Matches(SemComentarios(p)).Count)).Where(x => x.n > 0).ToDictionary(x => x.arquivo, x => x.n);
        Assert.Equal(esperado.OrderBy(x => x.Key), achados.OrderBy(x => x.Key));
        Assert.Equal(20, achados.Values.Sum());
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
        "CriarRespostaPronta", "AlterarRespostaPronta", "CriarFluxo", "SalvarRascunho", "SimularFluxo", "SubirChamado", "CriarUsuario", "AlterarUsuario", "NovaConversa", "NovaMensagem",
        "AvaliarConversa", "TransferirConversa", "AtendimentoDireto", "ResolverChamado", "RejeitarChamado", "CancelarChamado", "EncaminharChamado",
        "ReclassificarChamado", "MarcarDuplicado", "CriarArtigo", "AlterarArtigo", "AtivarPush", "AlterarAparencia", "CriarInstituicao", "AlterarMoodle", "CriarTokenMcp",
    ];

    static IEnumerable<Type> TiposDaApi() => typeof(Program).Assembly.GetTypes()
        .Where(t => t.Namespace is { } ns && ns.StartsWith("One.Api") && !ns.StartsWith("One.Api.Dados.Migracoes") && !t.Name.Contains('<'));

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
        Assert.Equal(36, entradas.Count);
        Assert.Equal(AsEntradas.Order(), entradas.Select(t => t.DeclaringType!.Name).Order());
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.All(entradas, t => Assert.Contains(t.DeclaringType!, mensagens));

        var endpoints = f.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>().ToList();
        var comCorpo = endpoints.Select(e => (e, corpo: e.Metadata.GetMetadata<Microsoft.AspNetCore.Http.Metadata.IAcceptsMetadata>()))
            .Where(x => x.corpo is not null && x.corpo.ContentTypes.Contains("application/json") && x.e.RoutePattern.RawText?.StartsWith("/api/mcp/") != true).ToList();
        Assert.Equal(36, comCorpo.Count);
        var porNome = Comparer<Type>.Create((a, b) => string.CompareOrdinal(a.FullName, b.FullName));
        Assert.Equal(entradas.Order(porNome), comCorpo.Select(x => x.corpo!.RequestType!).Order(porNome));
        foreach (var (e, corpo) in comCorpo)
        {
            var mensagem = corpo!.RequestType!.DeclaringType!;
            var mapa = Regex.Match(SemComentarios(ArquivoDo(mensagem)), @"\.Map(Get|Post|Put|Delete)\(\s*""([^""]+)""");
            Assert.True(mapa.Success, mensagem.Name);
            Assert.EndsWith(mapa.Groups[2].Value, e.RoutePattern.RawText);
            Assert.Equal(mapa.Groups[1].Value.ToUpperInvariant(), Assert.Single(e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods));
        }
    }

    static readonly string[] SemCorpoJson = ["DescartarRascunho", "DefinirSenha", "TrocarSenha", "BaixarAnexo", "BaixarAnexoConversa", "BaixarVersaoDocumento", "AtivarPush", "DesativarPush", "RemoverImagemInstituicao", "BaixarImagemInstituicao", "IniciarLoginMoodle", "LancamentoMoodle", "RevogarTokenMcp"];

    static readonly string[] ComRespostaAninhada =
    [
        "Login", "PrimeiroAcesso", "Eu", "VerInstituicao", "NovaConversa", "NovaMensagem", "VerConversa", "AvaliarConversa", "TransferirConversa",
        "AtendimentoDireto", "EncerrarConversa", "SimularFluxo", "VerDestino", "ListarChamados", "RespostasProntasDoSetor", "VerVersaoArtigo", "ImportarMatriculas", "VerChavePush", "VerAparencia", "AlterarAparencia", "EnviarImagemInstituicao", "ManifestoInstituicao",
        "ListarInstituicoes", "CriarInstituicao", "ImportarCargaInstituicao", "DesativarInstituicao", "ReativarInstituicao", "ReenviarAcesso",
        "ChavesMoodle", "VerMoodle", "AlterarMoodle", "VerMcp", "CriarTokenMcp",
    ];

    static readonly string[] AsDezAcoes =
        ["ResponderChamado", "AssumirChamado", "ResolverChamado", "ConfirmarChamado", "RejeitarChamado", "CancelarChamado", "EncaminharChamado", "ReclassificarChamado", "MarcarDuplicado", "SubirChamado"];

    static readonly (string fatia, string record, string[] casos)[] OsNoveShared =
    [
        ("Chamados", "DetalheChamado", ["VerChamado", .. AsDezAcoes]),
        ("Conhecimento", "ArtigoResposta", ["ListarArtigos", "CriarArtigo", "AlterarArtigo", "AtivarArtigo", "ArquivarArtigo"]),
        ("Conhecimento", "DocumentoResposta", ["ListarDocumentos", "CriarDocumento", "NovaVersaoDocumento", "ArquivarDocumento"]),
        ("Administracao", "UsuarioResposta", ["ListarUsuarios", "CriarUsuario", "AlterarUsuario", "DesativarUsuario"]),
        ("Administracao", "FluxoResposta", ["ListarFluxos", "CriarFluxo", "SalvarRascunho", "PublicarFluxo"]),
        ("Administracao", "SetorResposta", ["ListarSetores", "CriarSetor", "AlterarSetor"]),
        ("Administracao", "CategoriaResposta", ["ListarCategorias", "CriarCategoria", "AlterarCategoria"]),
        ("Administracao", "CursoResposta", ["ListarCursos", "CriarCurso", "AlterarCurso"]),
        ("Administracao", "RespostaProntaResposta", ["ListarRespostasProntas", "CriarRespostaPronta", "AlterarRespostaPronta"]),
    ];

    static string TextoDoCaso(Type mensagem) =>
        SemComentarios(typeof(One.Api.Chamados.IAcaoChamado).IsAssignableFrom(mensagem) ? Path.Combine(Api, "Chamados", "AgirNoChamado.cs") : ArquivoDo(mensagem));

    [Fact]
    public void Resposta_por_caso_de_uso()
    {
        var mensagens = Mensagens().Select(m => m.mensagem).ToList();
        Assert.Equal(87, mensagens.Count);
        var comJson = mensagens.Where(m => !SemCorpoJson.Contains(m.Name)).ToList();
        Assert.Equal(74, comJson.Count);

        var aninhadas = TiposDaApi().Where(t => t.IsNested && t.Name == "Resposta" && mensagens.Contains(t.DeclaringType!)).Select(t => t.DeclaringType!.Name).Order().ToList();
        Assert.Equal(ComRespostaAninhada.Order(), aninhadas);
        var doShared = OsNoveShared.SelectMany(x => x.casos.Select(c => (caso: c, x.record))).ToDictionary(x => x.caso, x => x.record);
        Assert.Equal(40, doShared.Count);

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

    [Fact]
    public void Pipeline_do_chamado_com_a_forma_da_base()
    {
        string[] Publicos(Type t) => [.. t.GetMembers(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.DeclaredOnly)
            .Where(m => m is not System.Reflection.ConstructorInfo && !(m is System.Reflection.MethodInfo { IsSpecialName: true })).Select(m => m.Name).Order()];

        var permissoes = typeof(One.Api.Chamados.PermissoesChamado);
        Assert.Equal(["Acoes", "Aluno", "Atendente", "Estados", "Lider"], Publicos(permissoes));
        Assert.Equal(typeof(string[]), permissoes.GetMethod("Estados")!.ReturnType);
        Assert.Equal([typeof(string), typeof(string)], permissoes.GetMethod("Estados")!.GetParameters().Select(p => p.ParameterType));
        Assert.Equal(typeof(IEnumerable<string>), permissoes.GetMethod("Acoes")!.ReturnType);
        Assert.Equal([typeof(string), typeof(string), typeof(long?), typeof(long)], permissoes.GetMethod("Acoes")!.GetParameters().Select(p => p.ParameterType));

        var acesso = typeof(One.Api.Chamados.AcessoChamado);
        Assert.Equal(["Agora", "Chamado", "Papel", "Preencher"], Publicos(acesso));
        Assert.All(acesso.GetProperties(), p => Assert.False(p.SetMethod is { IsPublic: true }, p.Name));
        var preencher = acesso.GetMethod("Preencher")!;
        Assert.Equal(typeof(void), preencher.ReturnType);
        Assert.Equal([typeof(Chamado), typeof(string), typeof(DateTime)],
            preencher.GetParameters().Select(p => p.ParameterType));

        var acao = typeof(One.Api.Chamados.IAcaoChamado);
        Assert.Equal(["Acao", "Criado", "Instituicao", "Numero", "Usuario", "Validar"], Publicos(acao));
        var validar = acao.GetMethod("Validar")!;
        Assert.Equal(typeof(ValueTask<IResult?>), validar.ReturnType);
        Assert.Equal([typeof(One.Api.Chamados.AcessoChamado), typeof(OneDb)], validar.GetParameters().Select(p => p.ParameterType));

        var agir = typeof(One.Api.Chamados.AgirNoChamado<,>);
        Assert.Equal(["Handle"], Publicos(agir));
        Assert.Equal([typeof(OneDb), typeof(One.Api.Chamados.AcessoChamado), typeof(TimeProvider)],
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

    [Fact]
    public async Task Anexo_e_VersaoDocumento_nao_guardam_bytes()
    {
        var modelo = await f.Db(null, db => Task.FromResult(db.Model));
        foreach (var tipo in new[] { typeof(Anexo), typeof(VersaoDocumento) })
        {
            Assert.DoesNotContain(tipo.GetProperties(), p => p.PropertyType == typeof(byte[]));
            var e = modelo.FindEntityType(tipo)!;
            Assert.DoesNotContain(e.GetProperties(), p => p.GetColumnType() == "bytea");

            var chave = e.FindProperty("Chave")!;
            Assert.False(chave.IsNullable);
            Assert.Contains(e.GetIndexes(), i => i.IsUnique && i.Properties.SequenceEqual([chave]));
            var hash = e.FindProperty("Hash")!;
            Assert.False(hash.IsNullable);
            Assert.Equal("char(64)", hash.GetColumnType());
            Assert.Equal(typeof(long), e.FindProperty("Tamanho")!.ClrType);
        }
        var colunas = await Colunas();
        foreach (var tabela in new[] { "anexo", "versao_documento" })
        {
            Assert.DoesNotContain(colunas, c => c.tabela == tabela && (c.coluna == "conteudo" || c.tipo == "bytea"));
            foreach (var coluna in new[] { "chave", "hash", "tamanho" })
                Assert.Contains(colunas, c => c.tabela == tabela && c.coluna == coluna && !c.nula);
        }
    }

    [Fact]
    public void Cliente_S3_configurado_como_a_door_2()
    {
        var s3 = Assert.IsType<Amazon.S3.AmazonS3Client>(f.Services.GetRequiredService<Amazon.S3.IAmazonS3>());
        Assert.Equal("http://localhost:9000", s3.Config.ServiceURL.TrimEnd('/'));
        Assert.True(Assert.IsType<Amazon.S3.AmazonS3Config>(s3.Config).ForcePathStyle);
        Assert.Equal(Amazon.Runtime.RequestChecksumCalculation.WHEN_REQUIRED, s3.Config.RequestChecksumCalculation);
        Assert.Equal(Amazon.Runtime.ResponseChecksumValidation.WHEN_REQUIRED, s3.Config.ResponseChecksumValidation);

        var codigos = new[] { File.ReadAllText(Path.Combine(Api, "Armazenamento.cs")), File.ReadAllText(Path.Combine(Raiz(), "One.Api.Tests", "Infra", "OneFactory.cs")) };
        foreach (var chave in new[] { "Endpoint", "Chave", "Segredo", "Bucket" })
            foreach (var codigo in codigos)
                Assert.Contains($"\"Armazenamento:{chave}\"", codigo);
    }

    [Fact]
    public void Baixar_so_com_chave_de_coluna_do_banco()
    {
        var chamam = CodigoApi().Where(p => Regex.IsMatch(SemComentarios(p), @"\.Baixar\(")).Select(Relativo).Order().ToList();
        Assert.Equal(["Assistente/BaixarAnexoConversa.cs", "Assistente/LerAnexosDaJanela.cs", "Chamados/BaixarAnexo.cs", "Conhecimento/BaixarVersaoDocumento.cs", "EnviadorSmtp.cs", "Instituicoes/BaixarImagemInstituicao.cs"], chamam);
        foreach (var arquivo in chamam)
        {
            var codigo = SemComentarios(Path.Combine(Api, arquivo));
            Assert.Matches(@"\.Baixar\(\w+\.Chave\)", codigo);
            Assert.Matches(@"new \w+\([^;]*x\.Chave", codigo);
        }
    }

    [Fact]
    public void Download_em_streaming_sem_array_inteiro()
    {
        foreach (var arquivo in new[] { "Chamados/BaixarAnexo.cs", "Conhecimento/BaixarVersaoDocumento.cs" })
        {
            var codigo = SemComentarios(Path.Combine(Api, arquivo));
            Assert.Contains("Results.Stream(", codigo);
            Assert.DoesNotContain("Results.File", codigo);
            Assert.DoesNotContain("byte[]", codigo);
        }
    }

    static readonly Regex ChamaDelete = new(@"\bDeleteObjects?(Async)?\b");

    [Fact]
    public void Codigo_do_api_nao_apaga_objeto() =>
        Assert.Empty(CodigoApi().Where(p => ChamaDelete.IsMatch(File.ReadAllText(p))).Select(Relativo));

    [Theory]
    [InlineData("DeleteObject")]
    [InlineData("DeleteObjectAsync")]
    [InlineData("DeleteObjects")]
    [InlineData("DeleteObjectsAsync")]
    public void Regra_de_delete_pega_cada_chamada(string nome) =>
        Assert.Matches(ChamaDelete, $"await s3.{nome}(new Req());");

    [Fact]
    public void Glossario_tem_armazenamento()
    {
        var linhas = File.ReadAllLines(Path.Combine(Raiz(), ".specs", "GLOSSARIO.md")).Where(l => l.StartsWith('|') && l.Contains("`Armazenamento`"));
        Assert.Contains(linhas, l => l.Trim().Trim('|').Split('|')[^1].Trim().Length >= 10);
    }

    [Fact]
    public void Compose_com_minio_por_digest()
    {
        var compose = File.ReadAllText(Path.Combine(Raiz(), "docker-compose.yml")).ReplaceLineEndings("\n");
        var minio = Regex.Match(compose, @"(?ms)^  minio:\n(.*?)(?=^  \w+:|^\w+:)").Groups[1].Value;
        Assert.Matches(@"image:\s*cgr\.dev/chainguard/minio@sha256:[0-9a-f]{64}\s", minio);
        Assert.Contains("command: server /data --console-address \":9001\"", minio);
        foreach (var trecho in new[] { "\"9000:9000\"", "\"9001:9001\"", "miniodata:/data", "healthcheck:", "MINIO_ROOT_USER:", "MINIO_ROOT_PASSWORD:" })
            Assert.Contains(trecho, minio);
        Assert.Matches(@"(?m)^volumes:\n(?:  \w+:\n)*  miniodata:", compose);

        var api = Regex.Match(compose, @"(?ms)^  api:\n(.*?)(?=^  \w+:|^\w+:)").Groups[1].Value;
        Assert.Matches(@"minio:\s*\n\s*condition: service_healthy", api);
        foreach (var chave in new[] { "Endpoint", "Chave", "Segredo", "Bucket" })
            Assert.Contains($"Armazenamento__{chave}:", api);
    }

    static IEnumerable<string> ArquivosDaApi() =>
        Directory.EnumerateFiles(Path.Combine(Raiz(), "One.Api"), "*.cs", SearchOption.AllDirectories)
            .Where(a => !a.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}") && !a.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"));

    [Fact]
    public void Contrato_do_hub()
    {
        var metodos = typeof(One.Api.Chamados.TempoRealHub).GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly);
        Assert.Equal(["EntrarNaFila()", "EntrarNoChamado(String)", "SairDoChamado(String)"],
            metodos.Select(m => $"{m.Name}({string.Join(",", m.GetParameters().Select(p => p.ParameterType.Name))})").Order());
        Assert.All(metodos, m => Assert.Equal(typeof(Task), m.ReturnType));

        var hub = f.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Where(e => e.Metadata.GetMetadata<Microsoft.AspNetCore.SignalR.HubMetadata>()?.HubType == typeof(One.Api.Chamados.TempoRealHub)).ToList();
        Assert.Equal(["/api/tempo-real", "/api/tempo-real/negotiate"], hub.Select(e => e.RoutePattern.RawText).Order());
    }

    [Fact]
    public void Grupos_num_so_lugar()
    {
        var comNome = ArquivosDaApi().Where(a => Regex.IsMatch(File.ReadAllText(a), @"\x22[^\x22\r\n]*\b(chamado|fila):")).Select(Path.GetFileName).ToList();
        Assert.Equal(["TempoRealGrupos.cs"], comNome);
        var hub = File.ReadAllText(Path.Combine(Api, "Chamados", "TempoRealHub.cs"));
        var usos = Regex.Matches(hub, @"TempoRealGrupos\.\w+\((\w+(?:\.\w+)*)").Select(m => m.Groups[1].Value).ToList();
        Assert.NotEmpty(usos);
        Assert.All(usos, u => Assert.Equal("u.InstituicaoId", u));
        Assert.DoesNotMatch(@"(?i)public async Task \w+\([^)]*instituicao", hub);
    }

    [Fact]
    public void Hub_so_envia_ChamadoMudou_e_FilaMudou()
    {
        var usam = ArquivosDaApi().Where(a => File.ReadAllText(a).Contains("IHubContext")).Select(Path.GetFileName).ToList();
        Assert.Equal(["AvisarMudanca.cs"], usam);
        var nomes = ArquivosDaApi().SelectMany(a => Regex.Matches(File.ReadAllText(a), @"\.SendAsync\(\x22(\w+)\x22").Select(m => m.Groups[1].Value)).Order().ToList();
        Assert.Equal(["ChamadoMudou", "FilaMudou"], nomes);
    }

    [Fact]
    public void Aviso_registrado_so_no_Program()
    {
        var program = File.ReadAllText(Path.Combine(Api, "Chamados", "ChamadosExtensoes.cs"));
        foreach (var termo in new[] { "AddSignalR(", "MapHub<TempoRealHub>(", "AddSingleton<IInterceptor>(sp => sp.GetRequiredService<AvisarMudanca>())" })
        {
            Assert.Contains(termo, program);
            Assert.Equal(["ChamadosExtensoes.cs"], ArquivosDaApi().Where(a => File.ReadAllText(a).Contains(termo)).Select(Path.GetFileName));
        }
        var infra = Directory.EnumerateFiles(Path.Combine(Raiz(), "One.Api.Tests", "Infra"), "*.cs").Select(File.ReadAllText).ToList();
        foreach (var termo in new[] { "AddSignalR", "MapHub", "AvisarMudanca" })
            Assert.DoesNotContain(infra, t => t.Contains(termo));
        var principal = File.ReadAllText(Path.Combine(Api, "Program.cs"));
        Assert.True(principal.IndexOf("AddPersistencia()", StringComparison.Ordinal) < principal.IndexOf("InstituicaoComando.Rodar", StringComparison.Ordinal));
    }

    [Fact]
    public void Push_configuracao_lida_em_um_lugar()
    {
        foreach (var chave in new[] { "Push:ChavePublica", "Push:ChavePrivada", "Push:Assunto" })
        {
            var arquivos = ArquivosQue(new Regex(Regex.Escape($"\"{chave}\"")));
            Assert.True(arquivos.Count == 1, $"{chave}: {arquivos.Count} arquivos");
            Assert.Equal(1, Regex.Matches(File.ReadAllText(Path.Combine(Api, arquivos[0])), Regex.Escape($"\"{chave}\"")).Count);
        }
    }

    [Fact]
    public void Push_chaves_fora_do_git()
    {
        var compose = File.ReadAllText(Path.Combine(Raiz(), "docker-compose.yml"));
        foreach (var (chave, variavel) in new[] { ("Push__ChavePublica", "PUSH_CHAVE_PUBLICA"), ("Push__ChavePrivada", "PUSH_CHAVE_PRIVADA"), ("Push__Assunto", "PUSH_ASSUNTO") })
            Assert.Matches(new Regex($@"(?m)^\s+{chave}:\s*\$\{{{variavel}:-\}}\s*$"), compose);
        foreach (var arquivo in Directory.EnumerateFiles(Api, "appsettings*.json", SearchOption.TopDirectoryOnly))
        {
            var push = System.Text.Json.JsonDocument.Parse(File.ReadAllText(arquivo)).RootElement;
            if (push.TryGetProperty("Push", out var bloco) && bloco.TryGetProperty("ChavePrivada", out var privada))
                Assert.True(string.IsNullOrEmpty(privada.GetString()), $"{Path.GetFileName(arquivo)} traz Push:ChavePrivada");
        }
        Assert.Contains(File.ReadAllLines(Path.Combine(Raiz(), ".gitignore")).Select(l => l.Trim()), l => l == ".env");
    }

    [Fact]
    public void Glossario_lista_subscricao_e_push_saida()
    {
        var linhas = File.ReadAllLines(Path.Combine(Raiz(), ".specs", "GLOSSARIO.md")).Where(l => l.StartsWith('|')).ToList();
        foreach (var termo in new[] { "SubscricaoPush", "PushSaida" })
            Assert.Contains(linhas, l => l.Contains($"`{termo}`") && l.Trim().Trim('|').Split('|')[^1].Trim().Length >= 10);
    }

    [Fact]
    public void Pacote_webpush_fixo()
    {
        var pacotes = System.Xml.Linq.XDocument.Load(Path.Combine(Api, "One.Api.csproj")).Descendants("PackageReference").Select(p => ((string?)p.Attribute("Include") ?? "", (string?)p.Attribute("Version"))).ToList();
        Assert.Contains(("Lib.Net.Http.WebPush", "3.3.1"), pacotes);
        Assert.DoesNotContain(pacotes, p => Regex.IsMatch(p.Item1, "(?i)push|vapid|firebase|onesignal") && p.Item1 != "Lib.Net.Http.WebPush");
    }

    static readonly string[] Excecoes_Dados_sem_EfCore =
    [
    ];

    static readonly string[] Excecoes_Relogio_so_pelo_TimeProvider =
    [
    ];

    static readonly string[] Excecoes_Entidade_sem_setter_publico =
    [
        "OneDb",
    ];

    static readonly string[] Excecoes_Raiz_sem_fatias =
    [
    ];

    static readonly string[] Excecoes_Handler_sem_new_de_entidade =
    [
        "Administracao/AlterarMoodle.cs",
        "Assistente/ConversaRotas.cs",
        "Chamados/ResponderChamado.cs",

    ];

    static readonly string[] Excecoes_Arquivo_ate_150_linhas =
    [
        "Dados/Chamados/Chamado.cs",
        "Dados/OneDb.cs",
    ];

    static readonly string[] Excecoes_Dados_ate_5_parametros =
    [
        "Dados.Chamados.Chamado.ResponderComoEquipe",
        "Dados.Mcp.TokenMcp.Criar",
        "Dados.Moodle.PlataformaMoodle.Configurar",
        "Dados.Push.SubscricaoPush.Registrar",
    ];

    static readonly string[] Excecoes_Mensagem_sem_entidade =
    [
        "Acesso.Eu",
        "Acesso.TrocarSenha",
        "Administracao.CriarTokenMcp",
        "Administracao.DesativarUsuario",
        "Assistente.AtendimentoDireto",
        "Assistente.AvaliarConversa",
        "Assistente.BaixarAnexoConversa",
        "Assistente.EncerrarConversa",
        "Assistente.NovaConversa",
        "Assistente.NovaMensagem",
        "Assistente.TransferirConversa",
        "Assistente.VerConversa",
        "Assistente.VerDestino",
        "Chamados.AssumirChamado",
        "Chamados.AtivarPush",
        "Chamados.BaixarAnexo",
        "Chamados.CancelarChamado",
        "Chamados.ConfirmarChamado",
        "Chamados.DesativarPush",
        "Chamados.EncaminharChamado",
        "Chamados.ListarChamados",
        "Chamados.MarcarDuplicado",
        "Chamados.ReclassificarChamado",
        "Chamados.RejeitarChamado",
        "Chamados.ResolverChamado",
        "Chamados.ResponderChamado",
        "Chamados.RespostasProntasDoSetor",
        "Chamados.SubirChamado",
        "Chamados.VerChamado",
        "Conhecimento.BaixarVersaoDocumento",
        "Indicadores.ConsultarIndicadores",
    ];

    static readonly string[] Excecoes_Service_locator_so_na_composicao =
    [
        "Agendador.cs",
        "Acesso/CookieDeSessao.cs",
    ];

    static readonly string[] Excecoes_Caso_de_uso_sem_chamada_estatica_de_outro =
    [
    ];

    static readonly string[] Excecoes_Sem_balde_horizontal =
    [
        "Administracao/Shared",
        "Assistente/ConversaRotas.cs",
        "Chamados/ChamadoRotas.cs",
        "Chamados/PushRotas.cs",
        "Chamados/Shared",
        "Conhecimento/ArtigoRotas.cs",
        "Conhecimento/DocumentoRotas.cs",
        "Conhecimento/Shared",
    ];

    static IEnumerable<Type> TiposDeDados() => typeof(Program).Assembly.GetTypes()
        .Where(t => t.Namespace is { } ns && (ns == "One.Api.Dados" || ns.StartsWith("One.Api.Dados.")) && !ns.StartsWith("One.Api.Dados.Migracoes")
            && !t.Name.Contains('<') && !t.IsDefined(typeof(System.Runtime.CompilerServices.CompilerGeneratedAttribute), false));

    static IEnumerable<Type> TiposDeEntidade() => TiposDeDados().Where(t => t is { IsClass: true, IsNested: false, IsAbstract: false }
        && (typeof(IDaInstituicao).IsAssignableFrom(t) || t == typeof(Instituicao)));

    static string NomeDoTipo(Type t) => t.FullName!["One.Api.".Length..];

    static string[] Ordenados(IEnumerable<string> itens) => [.. itens.Distinct().Order(StringComparer.Ordinal)];

    static void IgualAosOfensores(string[] excecoes, IEnumerable<string> ofensores)
    {
        var esperados = excecoes.Order(StringComparer.Ordinal).ToList();
        var reais = ofensores.Distinct().Order(StringComparer.Ordinal).ToList();
        Assert.True(esperados.SequenceEqual(reais), $"A lista de exceções tem de ser igual aos ofensores nos dois sentidos.\nSó na lista: [{string.Join(", ", esperados.Except(reais).Select(x => $"\"{x}\""))}]\nSó nos ofensores: [{string.Join(", ", reais.Except(esperados).Select(x => $"\"{x}\""))}]");
    }

    [Fact]
    public void Dados_sem_EfCore()
    {
        var sep = Path.DirectorySeparatorChar;
        var emDados = CodigoApi().Where(p => p.Contains($"{sep}Dados{sep}") && !p.EndsWith($"{sep}Dados{sep}OneDb.cs") && !p.Contains($"{sep}Dados{sep}Mapeamento{sep}"));
        IgualAosOfensores(Excecoes_Dados_sem_EfCore, ArquivosQue(new Regex(@"using\s+(static\s+)?Microsoft\.EntityFrameworkCore\b|\bOneDb\b|\bDbSet<|\bIQueryable<"), emDados));
    }

    [Fact]
    public void Relogio_so_pelo_TimeProvider()
    {
        var sep = Path.DirectorySeparatorChar;
        IgualAosOfensores(Excecoes_Relogio_so_pelo_TimeProvider, ArquivosQue(new Regex(@"TimeProvider\.System\b"), CodigoApi().Where(p => !p.EndsWith($"{sep}Program.cs"))));
    }

    [Fact]
    public void Entidade_sem_setter_publico() =>
        IgualAosOfensores(Excecoes_Entidade_sem_setter_publico, TiposDeDados()
            .Where(t => t.GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly)
                .Any(p => p.Name != "InstituicaoId" && p.SetMethod is { IsPublic: true } && !Init(p)))
            .Select(t => t.Name));

    [Fact]
    public void Raiz_sem_fatias()
    {
        var nomes = string.Join("|", Fatias);
        var referencia = new Regex($@"using\s+(static\s+)?One\.Api\.({nomes})\b|(?<![\w.])(One\.Api\.)?({nomes})\.[A-Z]");
        var arquivos = Directory.GetFiles(Api, "*.cs").Where(p => Path.GetFileName(p) != "Program.cs").Append(Path.Combine(Api, "Dados", "OneDb.cs"));
        IgualAosOfensores(Excecoes_Raiz_sem_fatias, ArquivosQue(referencia, arquivos));
    }

    [Fact]
    public void Handler_sem_new_de_entidade()
    {
        var sep = Path.DirectorySeparatorChar;
        var nomes = string.Join("|", TiposDeEntidade().Select(t => t.Name));
        var criacao = new Regex($@"\bnew\s+({nomes})\s*[({{]");
        IgualAosOfensores(Excecoes_Handler_sem_new_de_entidade, ArquivosQue(criacao, CodigoApi().Where(p => !p.Contains($"{sep}Dados{sep}"))));
    }

    [Fact]
    public void Arquivo_ate_150_linhas() =>
        IgualAosOfensores(Excecoes_Arquivo_ate_150_linhas, CodigoApi().Where(p => File.ReadAllLines(p).Length > 150).Select(Relativo));

    [Fact]
    public void Dados_ate_5_parametros() =>
        IgualAosOfensores(Excecoes_Dados_ate_5_parametros, TiposDeDados().SelectMany(t =>
            t.GetMethods(Declarados).Cast<System.Reflection.MethodBase>().Concat(t.GetConstructors(Declarados))
                .Where(m => !m.Name.Contains('<') && !m.IsDefined(typeof(System.Runtime.CompilerServices.CompilerGeneratedAttribute), false) && m.GetParameters().Length > 5)
                .Select(m => $"{NomeDoTipo(t)}.{(m is System.Reflection.ConstructorInfo ? "ctor" : m.Name)}")));

    [Fact]
    public void Mensagem_sem_entidade()
    {
        var entidades = TiposDeEntidade().ToHashSet();
        IgualAosOfensores(Excecoes_Mensagem_sem_entidade, Mensagens().Select(m => m.mensagem)
            .Where(t => t.GetProperties().Select(p => p.PropertyType).Concat(t.GetConstructors().SelectMany(c => c.GetParameters().Select(p => p.ParameterType)))
                .SelectMany(Desembrulhar).Any(entidades.Contains))
            .Select(NomeDoTipo));
    }

    static readonly string[] Composicao = ["Program.cs", "Armazenamento.cs", "Persistencia.cs", "Seguranca.cs", "TratamentoDeErros.cs"];

    [Fact]
    public void Service_locator_so_na_composicao()
    {
        var sep = Path.DirectorySeparatorChar;
        IgualAosOfensores(Excecoes_Service_locator_so_na_composicao,
            ArquivosQue(new Regex(@"\.GetRequiredService\b|\.GetService\b|\.GetServices\b|\.GetRequiredKeyedService\b"), CodigoApi().Where(p => !Composicao.Contains(Path.GetFileName(p)) && !p.EndsWith("Extensoes.cs"))));
    }

    [Fact]
    public void Caso_de_uso_sem_chamada_estatica_de_outro()
    {
        var casos = Mensagens().Select(m => m.mensagem.Name).Distinct().ToList();
        var ofensores = new List<string>();
        foreach (var arquivo in CodigoApi())
        {
            var codigo = SemComentarios(arquivo);
            var proprio = Path.GetFileNameWithoutExtension(arquivo);
            if (casos.Any(c => c != proprio && Regex.IsMatch(codigo, $@"(?<![\w.]){c}\.(?!Mapear\b)[A-Z]\w*\s*\(")))
                ofensores.Add(Relativo(arquivo));
        }
        IgualAosOfensores(Excecoes_Caso_de_uso_sem_chamada_estatica_de_outro, ofensores);
    }

    [Fact]
    public void Sem_balde_horizontal()
    {
        var sep = Path.DirectorySeparatorChar;
        var pastas = Directory.EnumerateDirectories(Api, "*", SearchOption.AllDirectories)
            .Where(d => !d.Contains($"{sep}bin") && !d.Contains($"{sep}obj") && Path.GetFileName(d) is "Shared" or "Common" or "Utils" or "Helpers").Select(Relativo);
        var rotas = ArquivosQue(new Regex(@"\bclass\s+\w+Rotas\b"));
        IgualAosOfensores(Excecoes_Sem_balde_horizontal, pastas.Concat(rotas));
    }
}
