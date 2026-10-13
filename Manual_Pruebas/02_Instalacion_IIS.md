# 2. Instalación en IIS con usuario y clave de SQL Server

Deja la aplicación funcionando en un servidor Windows con IIS. La **cadena de conexión** (con usuario y clave de SQL Server) y la **clave de los tokens** se guardan como **variables de entorno del grupo de aplicaciones de IIS**, nunca en un archivo del proyecto.

> **Estado de validación de esta guía.** Se comprobaron de punta a punta, en un equipo con SQL Server 2019: el usuario de SQL con permisos mínimos (las 228 pruebas de la API pasan con él), `probar-conexion.ps1`, `publicar.ps1`, la aplicación publicada ejecutándose en modo Producción con la cadena y la clave del token **solo en variables de entorno**, la web servida por la API (recarga de rutas incluida) y `verificar.ps1` (12 de 12). Lo que depende del servidor IIS mismo (`configurar-iis.ps1` y los pasos del Administrador de IIS) no pudo ejecutarse allí porque ese equipo no tiene IIS: su sintaxis está validada y los pasos siguen la configuración estándar de IIS, pero ejecútelos con atención la primera vez y avise si algo no coincide.

## Qué se va a hacer

```
 1. Activar IIS ──► 2. Instalar el Hosting Bundle de .NET 10 ──► 3. Preparar SQL Server
        │                                                              │
        └───────────────► 4. Publicar ──► 5. Configurar IIS ──► 6. Verificar
```

Tiempo aproximado: 45 minutos. Use **PowerShell como administrador** salvo que se indique otra cosa
(clic derecho en *Windows PowerShell* → *Ejecutar como administrador*). Si PowerShell bloquea un script, ejecute antes en esa misma ventana:
`Set-ExecutionPolicy -Scope Process Bypass`.

## Paso 1. Activar IIS

**Windows 10/11:**

```powershell
Enable-WindowsOptionalFeature -Online -All -NoRestart -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, IIS-DefaultDocument, IIS-HttpErrors, IIS-RequestFiltering, IIS-HttpCompressionStatic, IIS-ApplicationInit, IIS-ManagementConsole, IIS-ManagementScriptingTools
```

**Windows Server:**

```powershell
Install-WindowsFeature Web-Server, Web-Static-Content, Web-Default-Doc, Web-Http-Errors, Web-Filtering, Web-Stat-Compression, Web-AppInit, Web-Mgmt-Console, Web-Scripting-Tools
```

**Comprobar:** abra `http://localhost` en el navegador; debe verse la página azul de bienvenida de IIS. (Si el puerto 80 está ocupado, no pasa nada: esta aplicación usará el puerto 8080.)

## Paso 2. Instalar el Hosting Bundle de .NET 10

El *Hosting Bundle* es lo que permite que IIS ejecute aplicaciones .NET.

1. Descargue **"Hosting Bundle"** de la sección *ASP.NET Core Runtime 10.x* en https://dotnet.microsoft.com/download/dotnet/10.0
2. Instálelo **después** de IIS (si lo instaló antes, ejecute de nuevo el instalador y elija *Reparar*).
3. Reinicie IIS:
   ```powershell
   net stop was /y
   net start w3svc
   ```

**Comprobar** (las dos líneas deben dar un resultado):

```powershell
dotnet --list-runtimes | Select-String "Microsoft.AspNetCore.App 10"
Test-Path "$env:ProgramFiles\IIS\Asp.Net Core Module\V2\aspnetcorev2.dll"    # debe mostrar True
```

## Paso 3. Preparar SQL Server

### 3.1 Permitir usuario y clave de SQL Server

Por defecto SQL Server solo acepta la seguridad de Windows. Para usar usuario y clave:

1. Abra **SQL Server Management Studio**, clic derecho sobre el servidor → **Propiedades** → **Seguridad**.
2. Marque **Modo de autenticación de SQL Server y Windows** → Aceptar.
3. Reinicie el servicio *SQL Server* (clic derecho sobre el servidor → *Reiniciar*).

**Comprobar:** `sqlcmd -S localhost -Q "select SERVERPROPERTY('IsIntegratedSecurityOnly')"` debe mostrar `0`.

Si SQL Server está en **otro equipo**, también active el protocolo **TCP/IP** (*SQL Server Configuration Manager → Configuración de red → Protocolos*), reinicie el servicio y abra el puerto 1433 en el firewall del servidor de base de datos.

### 3.2 Crear la base de datos

Copie la carpeta `ScriptBD` al servidor (o clone el repositorio) y, desde ella:

```powershell
sqlcmd -S localhost -f 65001 -b -v NombreBD=dbALQUILERES -i Instalar.sql
```

**Resultado esperado:** `Datos de demostración cargados...` sin errores.

> ⚠️ Esto **borra y vuelve a crear** la base `dbALQUILERES`. Para una instalación con datos reales no use `DatosDemo.sql` ni los usuarios de demostración; consulte con el equipo de desarrollo.

### 3.3 Crear el usuario de la aplicación (permisos mínimos)

El usuario `gc_app` solo puede **leer y escribir datos**. No puede crear ni borrar tablas ni bases.

```powershell
sqlcmd -S localhost -f 65001 -b -i ..\Manual_Pruebas\scripts\CrearUsuarioSql.sql -v NombreBD=dbALQUILERES UsuarioApp=gc_app ClaveApp="<CLAVE SEGURA>"
```

Reemplace `<CLAVE SEGURA>` por una clave propia de **12 o más caracteres** con mayúsculas, minúsculas, números y símbolos.
**No use comillas simples (`'`) ni punto y coma (`;`)** en la clave: rompen la cadena de conexión. Anótela en su gestor de contraseñas; la necesitará en el paso 5.

### 3.4 Comprobar que el usuario funciona

```powershell
cd ..\Manual_Pruebas\scripts
.\probar-conexion.ps1 -Servidor localhost -BaseDatos dbALQUILERES -UsuarioSql gc_app
```

Le pide la clave (no se muestra). **Resultado esperado:** `OK: la conexión funciona.` con el número de tablas (24) y de contratos.
Si aparece `FALLÓ`, el propio script explica las causas más habituales. **No siga hasta que esta prueba dé OK.**

## Paso 4. Publicar la aplicación

Compila la web y la API y las deja juntas en una carpeta (la API sirve la web). Necesita el SDK de .NET 10 y Node.js 20.19 o superior en el equipo donde compila (no hacen falta en el servidor IIS).

> **Use PowerShell como administrador.** `C:\inetpub` es una carpeta protegida de Windows: sin permisos de administrador el script se detiene al inicio con el mensaje «No se puede escribir en…». (Alternativa sin administrador: publique en una carpeta propia, por ejemplo `-Destino C:\Publicado`, y cópiela a `C:\inetpub\GestionContratos` como administrador con `robocopy C:\Publicado C:\inetpub\GestionContratos /MIR`.)

Desde la raíz del proyecto:

```powershell
.\Manual_Pruebas\scripts\publicar.ps1 -Destino C:\inetpub\GestionContratos
```

**Resultado esperado:** tres pasos (`1/3`, `2/3`, `3/3`) y `Listo. Archivos en: C:\inetpub\GestionContratos`.
Compruebe que existen `web.config`, `GestionContratos.API.dll` y la carpeta `wwwroot` con `index.html`.

Si compiló en **otro equipo**, copie la carpeta resultante al servidor, por ejemplo:
`robocopy C:\publicado \\SERVIDOR\c$\inetpub\GestionContratos /MIR`.

## Paso 5. Configurar IIS y guardar las variables de entorno

### Opción A (recomendada): con el script

En PowerShell **como administrador**, desde `Manual_Pruebas\scripts`:

```powershell
.\configurar-iis.ps1 -Destino C:\inetpub\GestionContratos -Puerto 8080 -Servidor localhost -BaseDatos dbALQUILERES -UsuarioSql gc_app
```

Le pide la clave de `gc_app`. El script:

1. **Prueba la conexión** a SQL Server; si falla, se detiene sin cambiar nada.
2. Crea el grupo de aplicaciones `GestionContratos` (*sin código administrado*, siempre activo, sin apagado por inactividad).
3. **Guarda las variables de entorno** en ese grupo (tabla de abajo). La clave de los tokens se genera sola y no se muestra.
4. Crea el sitio en el puerto indicado y da permisos a la carpeta (lectura) y a `logs` (escritura).
5. Inicia el sitio y comprueba `/api/salud`.

**Resultado esperado:** `/api/salud: estado=ok, baseDatos=ok` y la lista con los nombres de las variables guardadas.
Si quiere que otros equipos de la red entren, agregue `-AbrirFirewall`.

### Opción B: a mano, con el Administrador de IIS

1. **Grupo de aplicaciones.** Administrador de IIS → *Grupos de aplicaciones* → *Agregar grupo de aplicaciones…*: nombre `GestionContratos`, versión de .NET CLR **Sin código administrado**, modo de canalización *Integrado* → Aceptar.
   Luego *Configuración avanzada…*: **Modo de inicio = AlwaysRunning**, **Tiempo de espera de inactividad (minutos) = 0**, Identidad = `ApplicationPoolIdentity`.
2. **Sitio.** Clic derecho en *Sitios* → *Agregar sitio web…*: nombre `GestionContratos`, grupo `GestionContratos`, ruta física `C:\inetpub\GestionContratos`, enlace *http*, puerto `8080`.
3. **Permisos.** Propiedades de `C:\inetpub\GestionContratos` → *Seguridad* → *Editar* → *Agregar* → escriba `IIS AppPool\GestionContratos` → *Lectura y ejecución*. Cree la carpeta `logs` y dé a esa misma cuenta el permiso *Modificar* sobre ella.
4. **Variables de entorno** (siguiente sección).
5. Inicie el sitio (clic derecho → *Administrar sitio web* → *Iniciar*).

### Las variables de entorno

Son tres obligatorias. El **doble guion bajo (`__`)** equivale a los dos puntos de la configuración (`ConnectionStrings:GestionContratos`).

| Nombre | Valor | Para qué sirve |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Modo producción: oculta la documentación de la API y los detalles de errores |
| `ConnectionStrings__GestionContratos` | `Server=SERVIDOR;Database=dbALQUILERES;User Id=gc_app;Password=<CLAVE>;Encrypt=True;TrustServerCertificate=True;` | Cómo se conecta a SQL Server (**con usuario y clave**) |
| `Jwt__Key` | Texto aleatorio de 48 o más caracteres | Firma los tokens de inicio de sesión |

Opcionales: `Contratos__ActualizacionAutomatica` (`true`/`false`), `Contratos__HorasEntreActualizaciones` (por defecto `6`), `Web__Carpeta` (otra carpeta para la web compilada).

Notas sobre la cadena de conexión:
- `Server=` lleva el nombre del servidor SQL; si es una instancia con nombre, `SERVIDOR\INSTANCIA`; si usa un puerto, `SERVIDOR,1433`.
- `Encrypt=True;TrustServerCertificate=True` es adecuado para **pruebas** con certificado autofirmado. En producción instale un certificado válido en SQL Server y **quite** `TrustServerCertificate=True`.

**Cómo agregarlas a mano (Editor de configuración):**
1. Administrador de IIS → seleccione el **nombre del equipo** (nivel servidor) → *Editor de configuración*.
2. En *Sección* elija `system.applicationHost/applicationPools`. Haga clic en **(Recopilación)** y en el botón **…**.
3. Seleccione en la lista el grupo `GestionContratos`. En el panel de abajo expanda `environmentVariables`, haga clic en **(Recopilación)** y en **…**.
4. *Agregar* una por una: en `name` escriba el nombre y en `value` el valor. Cierre la ventana y pulse **Aplicar** (panel derecho).

**Cómo ver, cambiar o borrar una variable con PowerShell** (como administrador):

```powershell
Import-Module WebAdministration
$ruta = 'MACHINE/WEBROOT/APPHOST'
$coleccion = "system.applicationHost/applicationPools/add[@name='GestionContratos']/environmentVariables"

# Ver solo los NOMBRES (no los valores)
Get-WebConfiguration -PSPath $ruta -Filter "$coleccion/add" | ForEach-Object { $_.name }

# Cambiar o agregar una variable (reemplace NOMBRE y VALOR)
Clear-WebConfiguration -PSPath $ruta -Filter "$coleccion/add[@name='NOMBRE']" -ErrorAction SilentlyContinue
Add-WebConfigurationProperty -PSPath $ruta -Filter $coleccion -Name '.' -Value @{ name = 'NOMBRE'; value = 'VALOR' }

# Borrar una variable
Clear-WebConfiguration -PSPath $ruta -Filter "$coleccion/add[@name='NOMBRE']"
```

IIS **recicla el grupo solo** cuando se cambian sus variables. Si no ve el cambio: `Restart-WebAppPool GestionContratos`.

**Qué tener en cuenta sobre la seguridad:**
- Los valores quedan en `applicationHost.config`, un archivo de configuración de IIS protegido por Windows (normalmente solo lo leen los **administradores** del servidor; la prueba H5 de la lista de pruebas lo comprueba en su equipo). Cuide quién tiene acceso al servidor.
- Esta forma es mejor que `web.config` (que viaja con la aplicación) y que las variables de sistema (`setx /M`), porque las variables del grupo son **solo de esta aplicación**. Evite las variables de sistema: las ven todas las aplicaciones y exigen reiniciar IIS.
- Para **cambiar la clave de SQL**: ejecute de nuevo `CrearUsuarioSql.sql` con la clave nueva (actualiza la del usuario existente) y luego `configurar-iis.ps1` (conserva la clave de los tokens).
- Para **cerrar todas las sesiones** o rotar la clave de los tokens: `configurar-iis.ps1 -RotarClaveJwt`.

## Paso 6. Verificar

1. Prueba automática, desde `Manual_Pruebas\scripts`:
   ```powershell
   .\verificar.ps1 -Url http://localhost:8080
   ```
   Le pide la clave de los usuarios de demostración. **Resultado esperado:** `Todo en orden: 12 de 12 comprobaciones correctas.`
2. Abra `http://localhost:8080` en el navegador: debe verse el login con el logo. Ingrese y recorra la [lista de pruebas](03_Lista_de_Pruebas.md).
3. Recargue la página estando en `/contratos` (tecla F5): no debe dar error 404.
4. `http://localhost:8080/scalar` y `/openapi/v1.json` (documentación de la API, solo de modo debug) **no deben mostrar la documentación**: verá la pantalla de ingreso de la web, nunca una página de Scalar ni un texto JSON.

### HTTPS (recomendado antes de usar con otras personas)

Con `http` las claves viajan sin cifrar por la red. Para una prueba local alcanza `http`; para cualquier otra cosa:
1. Instale un certificado (para pruebas: `New-SelfSignedCertificate -DnsName "su-servidor" -CertStoreLocation cert:\LocalMachine\My`).
2. Administrador de IIS → su sitio → *Enlaces…* → *Agregar*: tipo `https`, puerto 443, elija el certificado.
3. Si usa un puerto https distinto de 443, agregue la variable de entorno `ASPNETCORE_HTTPS_PORT` con ese número para que la redirección de http a https funcione.

## Actualizar a una versión nueva

```powershell
.\Manual_Pruebas\scripts\publicar.ps1 -Destino C:\inetpub\GestionContratos
```

Si el sitio ya está instalado, el script lo detiene unos segundos con un aviso de mantenimiento (`app_offline.htm`), copia los archivos y lo vuelve a iniciar. Las variables de entorno **no se tocan**. Después ejecute `verificar.ps1`.
Si la actualización incluye cambios en la base de datos, avise antes: `Instalar.sql` borra la base, no sirve para actualizar una instalación con datos.

## Desinstalar

```powershell
Import-Module WebAdministration
Remove-Website GestionContratos
Remove-WebAppPool GestionContratos          # también elimina sus variables de entorno
Remove-Item C:\inetpub\GestionContratos -Recurse -Force
sqlcmd -S localhost -f 65001 -b -i Manual_Pruebas\scripts\QuitarUsuarioSql.sql -v NombreBD=dbALQUILERES UsuarioApp=gc_app
```

## Problemas frecuentes

Primero mire **dónde** está el error: la ventana del navegador (código HTTP), el **Visor de eventos** (*Registros de Windows → Aplicación*, origen *IIS AspNetCore Module V2*) y, si hace falta, los registros de la aplicación (ver más abajo).

| Síntoma | Causa y solución |
|---|---|
| **HTTP 500.19** (error de configuración, a veces `0x8007000d`) | Falta el *Hosting Bundle* o se instaló antes que IIS. Paso 2 (instalar o *Reparar*) y `net stop was /y` + `net start w3svc`. |
| **HTTP 500.30** (*ASP.NET Core app failed to start*) | La aplicación arrancó y se cerró. Casi siempre falta una variable (`ConnectionStrings__GestionContratos` o `Jwt__Key`) o la cadena es incorrecta. Lea el Visor de eventos: el mensaje dice cuál falta. |
| **HTTP 500.31 / 502.5** (*Failed to find a compatible framework*) | No está el runtime de .NET 10. Instale el Hosting Bundle **de .NET 10**. |
| `/api/salud` responde **503** (`baseDatos: sin conexión`) | La API vive pero no llega a SQL Server: usuario o clave mal, servidor mal escrito, TCP/IP apagado o firewall. Repita `probar-conexion.ps1`. |
| Aparece `Login failed for user 'gc_app'` en el Visor de eventos | Clave distinta de la guardada, o el usuario no existe. Cambie la clave con `CrearUsuarioSql.sql` y vuelva a ejecutar `configurar-iis.ps1`. |
| **403.14** o página en blanco con listado | El sitio apunta a una carpeta sin `web.config` o sin publicar. Revise la ruta física y repita el paso 4. |
| La web carga pero **no hay pantallas** (pantalla blanca) | Falta `wwwroot` (se publicó con `-SinWeb`). Repita `publicar.ps1` sin esa opción. Pulse **Ctrl+F5** para limpiar la caché. |
| **404 al recargar** una pantalla (por ejemplo `/contratos`) | La web no está en `wwwroot`, o el módulo de ASP.NET Core no está activo. Repita los pasos 2 y 4. |
| El grupo de aplicaciones se detiene solo (*Detenido*) | IIS lo apaga tras fallar varias veces seguidas. Corrija la causa (ver 500.30) y pulse *Iniciar*. |
| Cambié una variable y no se nota | `Restart-WebAppPool GestionContratos`. |
| Todos tienen que volver a ingresar | Cambió `Jwt__Key` (o se ejecutó `-RotarClaveJwt`). Es lo esperado. |
| `Acceso denegado` en `logs` | Falta el permiso *Modificar* de `IIS AppPool\GestionContratos` sobre `C:\inetpub\GestionContratos\logs`. |
| `publicar.ps1` dice *No se puede escribir en 'C:\inetpub\…'* | Falta abrir PowerShell **como administrador** (ver paso 4). |
| El script dice *Falta el módulo de ASP.NET Core* | Paso 2 incompleto. Compruebe con `Test-Path "$env:ProgramFiles\IIS\Asp.Net Core Module\V2\aspnetcorev2.dll"` (debe dar True) y, como administrador, con `Get-WebGlobalModule -Name AspNetCoreModuleV2` (debe mostrar el módulo). |
| El puerto 8080 está en uso | Use otro: `-Puerto 8090`. |

### Ver el mensaje de error de la aplicación (registro `stdout`)

1. Cree la carpeta `C:\inetpub\GestionContratos\logs` (con permiso *Modificar* para `IIS AppPool\GestionContratos`; `configurar-iis.ps1` ya lo hace).
2. En `web.config` cambie `stdoutLogEnabled="false"` por `stdoutLogEnabled="true"`.
3. Recargue la página y lea el archivo más reciente de `logs\`.
4. **Al terminar vuelva a poner `false`** y borre esos archivos: pueden contener información de la base de datos.
   (Ojo: `publicar.ps1` reemplaza `web.config`; el cambio es solo para diagnosticar.)

Otra forma de ver el error sin IIS: abra PowerShell en la carpeta publicada, defina las tres variables **solo para esa ventana** (`$env:ConnectionStrings__GestionContratos = '...'`, etc.) y ejecute `dotnet .\GestionContratos.API.dll --urls http://localhost:5200`. Los mensajes salen en pantalla. Al cerrar la ventana, las variables desaparecen.
