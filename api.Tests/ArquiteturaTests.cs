using System.Text.RegularExpressions;
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
}
