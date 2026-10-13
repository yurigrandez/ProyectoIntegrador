<#
.SINOPSIS
  Comprueba que el usuario de SQL Server de la aplicación puede conectarse a la base de datos.

.DESCRIPCION
  Úselo ANTES de configurar IIS: si esta prueba falla, la aplicación tampoco podrá conectarse.
  Pide la clave por teclado (no se muestra ni queda en el historial de comandos).
  Funciona en Windows PowerShell 5.1 (el que trae Windows: powershell.exe). No requiere ser administrador.

.EJEMPLO
  .\probar-conexion.ps1 -Servidor localhost -BaseDatos dbALQUILERES -UsuarioSql gc_app
  .\probar-conexion.ps1 -Servidor "SERVIDOR01\SQL2019" -BaseDatos dbALQUILERES -UsuarioSql gc_app
#>
[CmdletBinding()]
param(
    [string]$Servidor = 'localhost',
    [string]$BaseDatos = 'dbALQUILERES',
    [string]$UsuarioSql = 'gc_app',
    [System.Security.SecureString]$Clave
)

$ErrorActionPreference = 'Stop'

if (-not $Clave) {
    $Clave = Read-Host -Prompt "Clave de $UsuarioSql" -AsSecureString
}
$claveTexto = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Clave))

$cadena = "Server=$Servidor;Database=$BaseDatos;User Id=$UsuarioSql;Password=$claveTexto;Encrypt=True;TrustServerCertificate=True;"
$conexion = New-Object System.Data.SqlClient.SqlConnection($cadena)
try {
    $conexion.Open()
    $comando = $conexion.CreateCommand()
    $comando.CommandText = @"
select SUSER_SNAME() as usuario, DB_NAME() as base,
       (select count(*) from sys.tables) as tablas,
       (select count(*) from tabUSUARIOS) as usuarios,
       (select count(*) from tabCONTRATOS) as contratos,
       IS_MEMBER('db_owner') as es_dueno
"@
    $lector = $comando.ExecuteReader()
    [void]$lector.Read()
    Write-Host ''
    Write-Host '  OK: la conexión funciona.' -ForegroundColor Green
    Write-Host ("  Usuario: {0} | Base: {1} | Tablas: {2} | Usuarios: {3} | Contratos: {4}" -f $lector['usuario'], $lector['base'], $lector['tablas'], $lector['usuarios'], $lector['contratos'])
    if ($lector['es_dueno'] -eq 1) {
        Write-Host '  AVISO: este usuario es db_owner. Para la aplicación conviene un usuario de solo lectura y escritura (ver CrearUsuarioSql.sql).' -ForegroundColor Yellow
    }
    $lector.Close()
    Write-Host ''
    Write-Host '  Cadena de conexión para la variable de entorno (la clave va aparte, nunca en un archivo):'
    Write-Host "  Server=$Servidor;Database=$BaseDatos;User Id=$UsuarioSql;Password=<su clave>;Encrypt=True;TrustServerCertificate=True;"
    exit 0
}
catch {
    Write-Host ''
    Write-Host '  FALLÓ la conexión:' -ForegroundColor Red
    Write-Host ("  " + $_.Exception.Message)
    Write-Host ''
    Write-Host '  Causas habituales:'
    Write-Host '   - Login failed for user: usuario o clave incorrectos, o el usuario no existe (ejecute CrearUsuarioSql.sql).'
    Write-Host '   - Login failed ... not associated with a trusted SQL Server connection: SQL Server solo admite autenticación de Windows (active el modo mixto).'
    Write-Host '   - Server was not found / network-related: nombre del servidor incorrecto, servicio detenido o TCP/IP desactivado (SQL Server Configuration Manager).'
    exit 1
}
finally {
    $conexion.Dispose()
    $claveTexto = $null
}
