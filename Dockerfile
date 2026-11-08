# Um contêiner: o One.Api/ serve a API e a SPA compilada em wwwroot (door 10).
FROM node:24-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY One.Api/One.Api.csproj One.Api/
RUN dotnet restore One.Api/One.Api.csproj
COPY One.Api/ One.Api/
RUN dotnet publish One.Api/One.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /src/One.Api/wwwroot ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "One.Api.dll"]
