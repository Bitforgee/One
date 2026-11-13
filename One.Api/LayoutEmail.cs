namespace One.Api;

public static class LayoutEmail
{
    const string CorPadrao = "#224fa7";

    static string Escapar(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");

    public static string Html(string nome, string? cor, bool logo, string corpo)
    {
        var linhas = string.Join("<br>", corpo.Replace("\r", "").TrimEnd('\n').Split('\n').Select(Escapar));
        var imagem = logo ? $"<img src=\"cid:logo\" alt=\"{Escapar(nome)}\" style=\"max-height:40px;vertical-align:middle;margin-right:12px\">" : "";
        return $"<!DOCTYPE html><html><body style=\"margin:0;font-family:Arial,sans-serif;color:#1a1a1a\">" +
            $"<div style=\"background-color:{cor ?? CorPadrao};color:#ffffff;padding:16px 24px;font-size:18px\">{imagem}<span style=\"vertical-align:middle\">{Escapar(nome)}</span></div>" +
            $"<p style=\"padding:16px 24px;line-height:1.5\">{linhas}</p></body></html>";
    }
}