using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Instituicoes;

public sealed record AlterarAparencia(AlterarAparencia.Entrada Corpo) : IRequest<IResult>
{
    public sealed record Entrada(string? NomeCurto, string? Cor, LoginAparencia? Login, AssistenteAparencia? Assistente, ContatoAparencia? Contato);

    public sealed record Resposta : AparenciaDados
    {
        public Resposta(AparenciaDados d) : base(d) { }
    }

    public static void Mapear(RouteGroupBuilder g) => g.MapPut("/aparencia", (Entrada e, IMediator m) => m.Send(new AlterarAparencia(e)));

    static string? Limpo(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    static string[] Lista(IReadOnlyList<string>? l) => [.. (l ?? []).Select(Limpo).OfType<string>()];

    public static Entrada Normalizar(Entrada e) => new(Limpo(e.NomeCurto), Limpo(e.Cor),
        new(Limpo(e.Login?.Titulo), Limpo(e.Login?.Frase), Lista(e.Login?.Itens)),
        new(Limpo(e.Assistente?.Nome), Limpo(e.Assistente?.BoasVindas), Lista(e.Assistente?.Perguntas)),
        new(Limpo(e.Contato?.Horario), Limpo(e.Contato?.Telefone), Limpo(e.Contato?.Email)));

    public static IResult? Validar(Entrada e)
    {
        if (e.Cor is not null && !ContrasteDaCor.Aceita(e.Cor)) return Problemas.Invalido(ContrasteDaCor.Recusa, "cor");
        (string Campo, string Rotulo, string? Valor, int Max)[] textos =
        [
            ("nomeCurto", "O nome curto", e.NomeCurto, 12),
            ("login.titulo", "O título do login", e.Login!.Titulo, 60),
            ("login.frase", "A frase do login", e.Login.Frase, 160),
            ("assistente.nome", "O nome do assistente", e.Assistente!.Nome, 40),
            ("assistente.boasVindas", "As boas-vindas do assistente", e.Assistente.BoasVindas, 300),
            ("contato.horario", "O horário do contato", e.Contato!.Horario, 120),
            ("contato.telefone", "O telefone do contato", e.Contato.Telefone, 30),
            ("contato.email", "O e-mail do contato", e.Contato.Email, 120),
        ];
        var longo = textos.FirstOrDefault(t => t.Valor?.Length > t.Max);
        if (longo.Campo is not null) return Problemas.Invalido($"{longo.Rotulo} aceita até {longo.Max} caracteres.", longo.Campo);
        if (e.Contato.Email is not null && !EnviadorSmtp.Valido().IsMatch(e.Contato.Email)) return Problemas.Invalido("Informe um e-mail válido para o contato.", "contato.email");
        return ValidarListas(e);
    }

    static IResult? ValidarListas(Entrada e)
    {
        (string Campo, string Rotulo, IReadOnlyList<string> Itens, int Quantidade, int Max)[] listas =
        [
            ("login.itens", "Os itens do login", e.Login!.Itens!, 3, 80),
            ("assistente.perguntas", "As perguntas sugeridas", e.Assistente!.Perguntas!, 4, 100),
        ];
        foreach (var (campo, rotulo, itens, quantidade, max) in listas)
        {
            if (itens.Count > quantidade) return Problemas.Invalido($"{rotulo} aceitam até {quantidade}.", campo);
            if (itens.Any(x => x.Length > max)) return Problemas.Invalido($"Cada item de {rotulo.ToLowerInvariant()} aceita até {max} caracteres.", campo);
        }
        return null;
    }

    public static void Aplicar(Instituicao i, Entrada e) => i.AlterarAparencia(new DadosDeAparencia
    {
        NomeCurto = e.NomeCurto, Cor = e.Cor,
        LoginTitulo = e.Login!.Titulo, LoginFrase = e.Login.Frase, LoginItens = e.Login.Itens,
        AssistenteNome = e.Assistente!.Nome, AssistenteBoasVindas = e.Assistente.BoasVindas, AssistentePerguntas = e.Assistente.Perguntas,
        ContatoHorario = e.Contato!.Horario, ContatoTelefone = e.Contato.Telefone, ContatoEmail = e.Contato.Email,
    });
}

public sealed class AlterarAparenciaHandler(OneDb db) : IRequestHandler<AlterarAparencia, IResult>
{
    public async ValueTask<IResult> Handle(AlterarAparencia m, CancellationToken ct)
    {
        var e = AlterarAparencia.Normalizar(m.Corpo);
        if (AlterarAparencia.Validar(e) is { } erro) return erro;
        var i = await db.Instituicoes.SingleAsync(x => x.Id == db.InstituicaoAtual, ct);
        AlterarAparencia.Aplicar(i, e);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new AlterarAparencia.Resposta(AparenciaDados.De(i, await db.ImagensInstituicao.ToListAsync(ct))));
    }
}
