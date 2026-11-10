namespace One.Api.Dados.Moodle;

public class VinculoMoodle : IDaInstituicao
{
    public long Id { get; private set; }
    public long InstituicaoId { get; set; }
    public long UsuarioId { get; private set; }
    public string Emissor { get; private set; } = "";
    public string Sub { get; private set; } = "";
    public DateTime CriadoEm { get; private set; }

    public static VinculoMoodle Criar(long usuarioId, string emissor, string sub, DateTime agora) =>
        new() { UsuarioId = usuarioId, Emissor = emissor, Sub = sub, CriadoEm = agora };
}
