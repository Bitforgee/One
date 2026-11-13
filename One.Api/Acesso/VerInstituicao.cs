using Mediator;
using Microsoft.EntityFrameworkCore;
using One.Api.Dados;

namespace One.Api.Acesso;

public sealed record VerInstituicao(string Slug) : IRequest<IResult>
{
    public sealed record Resposta(
        string Nome, string? NomeCurto, string? Cor, Resposta.DoLogin Login, Resposta.DoAssistente Assistente, Resposta.DoContato Contato, Resposta.DasImagens Imagens)
    {
        public sealed record DoLogin(string? Titulo, string? Frase, IReadOnlyList<string>? Itens);

        public sealed record DoAssistente(string? Nome, string? BoasVindas, IReadOnlyList<string>? Perguntas);

        public sealed record DoContato(string? Horario, string? Telefone, string? Email);

        public sealed record DasImagens(int? Logo, int? Icone, int? Login, int? Assistente);

        public static Resposta De(Instituicao i, IEnumerable<ImagemInstituicao> imagens)
        {
            int? Versao(string tipo) => imagens.FirstOrDefault(x => x.Tipo == tipo && x.RemovidaEm is null)?.Versao;
            return new(i.Nome, i.NomeCurto, i.Cor,
                new DoLogin(i.LoginTitulo, i.LoginFrase, i.LoginItens ?? []),
                new DoAssistente(i.AssistenteNome, i.AssistenteBoasVindas, i.AssistentePerguntas ?? []),
                new DoContato(i.ContatoHorario, i.ContatoTelefone, i.ContatoEmail),
                new DasImagens(Versao(TiposDeImagem.Logo), Versao(TiposDeImagem.Icone), Versao(TiposDeImagem.Login), Versao(TiposDeImagem.Assistente)));
        }
    }

    public static void Mapear(RouteGroupBuilder g) =>
        g.MapGet("/instituicoes/{slug}", (string slug, IMediator m) => m.Send(new VerInstituicao(slug))).AllowAnonymous();
}

public sealed class VerInstituicaoHandler(OneDb db) : IRequestHandler<VerInstituicao, IResult>
{
    public async ValueTask<IResult> Handle(VerInstituicao m, CancellationToken ct)
    {
        if (await db.Instituicoes.FirstOrDefaultAsync(i => i.Slug == m.Slug && i.Ativa, ct) is not { } i) return Problemas.Erro(404, "Instituição não encontrada.");
        db.InstituicaoAtual = i.Id;
        return Results.Ok(VerInstituicao.Resposta.De(i, await db.ImagensInstituicao.ToListAsync(ct)));
    }
}
