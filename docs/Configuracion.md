# Configuración y secretos

**Regla:** las cadenas de conexión, claves y contraseñas **nunca** se escriben en archivos del repositorio
(ni en `appsettings*.json`, ni en scripts, ni en documentación). Se entregan a la aplicación así:

| Ambiente | Mecanismo |
|---|---|
| Desarrollo local | **user-secrets** de .NET (se guardan fuera del repositorio, en `%APPDATA%\Microsoft\UserSecrets\<id>\secrets.json`) |
| Pruebas, QA, producción, CI | **Variables de entorno** (el doble guion bajo `__` equivale a `:` en la jerarquía) |

Lo que sí va en `appsettings.json` es configuración no sensible: emisor y audiencia del JWT, minutos de expiración y
orígenes CORS.

## Valores que necesita la API

| Clave de configuración | Variable de entorno | Uso |
|---|---|---|
| `ConnectionStrings:GestionContratos` | `ConnectionStrings__GestionContratos` | Conexión a la BD (`dbALQUILERES`) |
| `Jwt:Key` | `Jwt__Key` | Clave de firma de los tokens (mínimo 32 caracteres, aleatoria) |

Si falta alguno, la API **no arranca** y el mensaje de error indica cómo definirlo.

## Desarrollo local (user-secrets)

Los proyectos `GestionContratos.API` y `GestionContratos.Pruebas` ya tienen su `UserSecretsId`. Desde la carpeta `Backend`:

```bash
# Cadena de conexión de desarrollo (autenticación integrada de Windows)
dotnet user-secrets set "ConnectionStrings:GestionContratos" "Server=localhost;Database=dbALQUILERES;Trusted_Connection=True;TrustServerCertificate=True;" --project GestionContratos.API

# Clave JWT: genere una aleatoria (ejemplo con Python)
python -c "import secrets; print(secrets.token_urlsafe(48))"
dotnet user-secrets set "Jwt:Key" "<valor generado>" --project GestionContratos.API

# Ver lo configurado
dotnet user-secrets list --project GestionContratos.API
```

Con usuario y contraseña de SQL Server, la cadena sería
`Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True;`; esa contraseña también va solo en user-secrets.

Los user-secrets solo se cargan cuando `ASPNETCORE_ENVIRONMENT=Development` (el perfil de `launchSettings.json` ya lo define).

## Base de datos de pruebas

Las pruebas de integración usan SQL Server local (no en memoria) y una **BD distinta de la de desarrollo**, que debe
terminar en `_TEST` (si no, las pruebas se niegan a ejecutarse). Desde `ScriptBD`:

```bash
sqlcmd -S localhost -f 65001 -b -v NombreBD=dbALQUILERES_TEST -i Instalar.sql
```

```bash
dotnet user-secrets set "ConnectionStrings:GestionContratosPruebas" "Server=localhost;Database=dbALQUILERES_TEST;Trusted_Connection=True;TrustServerCertificate=True;" --project GestionContratos.Pruebas
dotnet test
```

En CI se usa la variable de entorno `ConnectionStrings__GestionContratosPruebas`. Las pruebas definen su propia clave
JWT interna; no usan la de desarrollo. Las pruebas que escriben datos lo hacen dentro de una transacción que se revierte.

## Otros ambientes (variables de entorno)

PowerShell:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:ConnectionStrings__GestionContratos = "<cadena de conexión>"
$env:Jwt__Key = "<clave aleatoria>"
dotnet GestionContratos.API.dll
```

En servidores o contenedores se definen en el gestor de secretos de la plataforma (variables del servicio, secretos
de Docker/Kubernetes, Azure Key Vault, etc.), nunca en el código ni en la imagen.

## Usuarios de demostración

`ScriptBD/Datos.sql` crea dos usuarios **solo para demostración**, con la clave `Demo123*` (guardada como hash BCrypt):

| Código | Rol |
|---|---|
| `ADMIN` | Administrador (autoriza contratos) |
| `OPERADOR` | Operador |

Antes de usar la BD fuera de un entorno de demostración hay que cambiar o eliminar estos usuarios.

## Cómo evitar subir secretos por error

- El `.gitignore` excluye `secrets.json`, `.env*`, `appsettings.*.local.json` y archivos de claves/certificados.
- Antes de cada commit conviene revisar `git diff --staged` y buscar cadenas como `Password=`, `Pwd=` o `Jwt`.
- Si un secreto llegara a subirse: rotarlo de inmediato (cambiar la contraseña o generar otra `Jwt:Key`); borrar el commit
  no basta, porque el valor ya queda expuesto.
