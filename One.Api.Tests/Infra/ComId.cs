namespace One.Api.Tests;

public static class ComIdExtensoes
{
    public static T ComId<T>(this T entidade, long id) where T : class
    {
        typeof(T).GetProperty("Id")!.SetValue(entidade, id);
        return entidade;
    }
}
