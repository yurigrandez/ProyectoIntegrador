# 1. Modo debug (en su computadora)

Para probar y depurar mientras se desarrolla. La web y la API corren por separado y puede poner puntos de interrupción.

## 1. Programas necesarios

Abra una ventana de **PowerShell** y compruebe cada uno. Si algún comando falla, instale ese programa.

| Programa | Comando de comprobación | Debe mostrar |
|---|---|---|
| SDK de .NET 10 | `dotnet --version` | `10.0.xxx` |
| Node.js | `node -v` | `v20.19` o superior (se probó con `v24`) |
| Angular CLI (opcional) | `ng version` | `Angular CLI: 21.x` |
| SQL Server 2019 o superior | `sqlcmd -S localhost -Q "select @@version"` | La versión de SQL Server |
| Git | `git --version` | cualquier versión |

> Si `sqlcmd` no existe, instale *Microsoft Command Line Utilities for SQL Server*.

Descargue el proyecto y entre a la carpeta:

```powershell
git clone https://github.com/yurigrandez/ProyectoIntegrador.git
cd ProyectoIntegrador
```

## 2. Crear la base de datos de desarrollo

Desde la carpeta `ScriptBD`:

```powershell
cd ScriptBD
sqlcmd -S localhost -f 65001 -b -v NombreBD=dbALQUILERES -i Instalar.sql
```

**Resultado esperado:** al final aparece `Datos de demostración cargados...` y ningún mensaje de error. Esto crea 24 tablas, vistas, catálogos y datos de ejemplo (12 locales, 10 clientes, 11 contratos).

> ⚠️ Este comando **borra y vuelve a crear** `dbALQUILERES`. Si ya la tiene con información que quiere conservar, use otro nombre (por ejemplo `-v NombreBD=dbALQUILERES_DEV`) y use ese mismo nombre en el paso siguiente.

Para las pruebas automáticas necesita además una segunda base, **que debe terminar en `_TEST`** (las pruebas se niegan a ejecutarse contra otra):

```powershell
sqlcmd -S localhost -f 65001 -b -v NombreBD=dbALQUILERES_TEST -i Instalar.sql
cd ..
```

## 3. Guardar los secretos (user-secrets)

Los *user-secrets* se guardan en su perfil de Windows, **fuera del proyecto**, así que nunca se suben a GitHub. Desde la carpeta `Backend`:

```powershell
cd Backend

# 3.1 Cadena de conexión (con la seguridad de Windows: no lleva clave)
dotnet user-secrets set "ConnectionStrings:GestionContratos" "Server=localhost;Database=dbALQUILERES;Trusted_Connection=True;TrustServerCertificate=True;" --project GestionContratos.API

# 3.2 Clave para firmar los tokens: genere una aleatoria y guárdela
$clave = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
dotnet user-secrets set "Jwt:Key" $clave --project GestionContratos.API

# 3.3 Cadena para las pruebas automáticas (base _TEST)
dotnet user-secrets set "ConnectionStrings:GestionContratosPruebas" "Server=localhost;Database=dbALQUILERES_TEST;Trusted_Connection=True;TrustServerCertificate=True;" --project GestionContratos.Pruebas
```

Para ver lo guardado: `dotnet user-secrets list --project GestionContratos.API`.

### ¿Quiere probar con usuario y clave de SQL Server también en debug?

Es útil para asegurarse de que la aplicación funciona con los permisos mínimos que tendrá en IIS.

1. Cree el usuario (la clave se pasa aquí, no queda en ningún archivo):
   ```powershell
   cd ..\ScriptBD
   sqlcmd -S localhost -f 65001 -b -i ..\Manual_Pruebas\scripts\CrearUsuarioSql.sql -v NombreBD=dbALQUILERES UsuarioApp=gc_app ClaveApp="<su clave segura>"
   ```
2. Cambie la cadena de conexión guardada (reemplace `<su clave segura>`):
   ```powershell
   cd ..\Backend
   dotnet user-secrets set "ConnectionStrings:GestionContratos" "Server=localhost;Database=dbALQUILERES;User Id=gc_app;Password=<su clave segura>;Encrypt=True;TrustServerCertificate=True;" --project GestionContratos.API
   ```
   Requiere que SQL Server admita autenticación mixta (ver [02_Instalacion_IIS.md](02_Instalacion_IIS.md), paso 4).

## 4. Iniciar la API

Desde `Backend`:

```powershell
dotnet run --project GestionContratos.API --launch-profile http
```

**Resultado esperado:** `Now listening on: http://localhost:5099` y `Hosting environment: Development`. Déjela abierta.

Compruébelo en el navegador:

- `http://localhost:5099/api/salud` → `{"estado":"ok","baseDatos":"ok"}`
- `http://localhost:5099/scalar` → documentación interactiva de la API (solo existe en modo debug). Para probar un endpoint protegido: haga `POST /api/auth/login`, copie el `token` y péguelo en el botón de autorización.

## 5. Iniciar la web

En **otra** ventana de PowerShell, desde la raíz del proyecto:

```powershell
cd Frontend\gestion-contratos
npm install        # solo la primera vez (tarda unos minutos)
npm start
```

**Resultado esperado:** `Local: http://localhost:4200/`. Abra esa dirección. Debería ver la pantalla de ingreso con el logo de la empresa. Entre con **ADMIN** u **OPERADOR** (la clave de demostración también aparece en la pantalla de ingreso).

La web llama a `/api/...` y el servidor de desarrollo reenvía esas llamadas a `http://localhost:5099` (archivo `proxy.conf.json`), por eso la API debe estar iniciada antes.

## 6. Depurar con puntos de interrupción

**Visual Studio (una versión compatible con .NET 10, como Visual Studio 2026):** abra `Backend\GestionContratos.sln`, elija el proyecto `GestionContratos.API` y el perfil **http**, y pulse **F5**. Coloque puntos de interrupción en los servicios (`GestionContratos.Negocio`) o en los controladores.

**Visual Studio Code:** instale la extensión *C# Dev Kit*, abra la carpeta del proyecto, vaya a la pestaña *Run and Debug* y pulse *Create a launch.json* eligiendo `GestionContratos.API` (use el perfil `http`).

**Línea de comandos:** `dotnet watch --project GestionContratos.API --launch-profile http` reinicia la API sola al guardar cambios.

Para la web, abra las herramientas del navegador (**F12**): pestaña *Red* para ver las llamadas a la API, *Consola* para errores.

## 7. Pruebas automáticas

```powershell
# Pruebas de la API y la lógica (necesitan la base _TEST y sus secretos del paso 3.3)
cd Backend
dotnet test
```

**Resultado esperado:** `Correctas! ... Superado: 228` (el número puede crecer con nuevas funciones). Tardan unos 30 segundos.

```powershell
# Pruebas de la web
cd ..\Frontend\gestion-contratos
npm test -- --watch=false
```

**Resultado esperado:** `Test Files 14 passed` y `Tests 154 passed`.

> Las pruebas crean datos y los borran al terminar. Nunca se ejecutan contra una base cuyo nombre no termine en `_TEST`.

## 8. Prueba rápida automática

Con la API y la web iniciadas, desde la carpeta `Manual_Pruebas\scripts`:

```powershell
.\verificar.ps1 -Url http://localhost:4200 -ModoDebug
```

Le pedirá la clave de los usuarios de demostración. **Resultado esperado:** `Todo en orden: 11 de 11 comprobaciones correctas.`
(Si PowerShell bloquea el script, ejecute antes: `Set-ExecutionPolicy -Scope Process Bypass`.)

Después siga la [lista de pruebas manuales](03_Lista_de_Pruebas.md).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| La API no inicia: `Falta la cadena de conexión 'ConnectionStrings:GestionContratos'` | No se guardaron los secretos. Repita el paso 3.1 y compruebe con `dotnet user-secrets list --project GestionContratos.API`. |
| La API no inicia: `Falta 'Jwt:Key'` | Repita el paso 3.2. |
| `Cannot open database "dbALQUILERES"` | La base no existe o se llama distinto. Repita el paso 2 o corrija el nombre en la cadena. |
| En la web, al ingresar: *No se pudo conectar con el servidor* | La API no está iniciada, o corre en otro puerto. Inicie la API (paso 4) y recargue. |
| Al ingresar: *Usuario o clave incorrectos* con la clave correcta | La base no tiene los usuarios de demostración (se creó con otro script). Repita el paso 2. |
| `dotnet test` dice que falta la cadena de pruebas | Repita el paso 3.3 y verifique que la base termina en `_TEST`. |
| `npm start`: *Port 4200 is already in use* | Hay otra copia corriendo. Ciérrela, o use otro puerto con `npm start -- --port 4300`. |
| `sqlcmd` no se reconoce | Instale *Command Line Utilities for SQL Server* y abra una PowerShell nueva. |
| Las pantallas muestran datos raros o vacíos | Los datos de demostración usan fechas relativas al día de instalación. Vuelva a ejecutar `Instalar.sql` para refrescarlos. |
