<#
.SINOPSIS
  Prueba rápida ("humo") de una instalación: comprueba que la web, la API, el login y los permisos funcionan.

.DESCRIPCION
  Hace 12 comprobaciones en unos 10 segundos y muestra OK o FALLÓ en cada una.
  Pide la clave de los usuarios de demostración por teclado (los usuarios ADMIN y OPERADOR, ver README).
  No crea ni modifica datos: solo consulta.

.EJEMPLO
  .\verificar.ps1                                   # contra http://localhost:8080 (IIS)
  .\verificar.ps1 -Url http://localhost:5099        # contra la API en modo debug
#>
[CmdletBinding()]
param(
    [string]$Url = 'http://localhost:8080',
    [string]$UsuarioAdmin = 'ADMIN',
    [string]$UsuarioOperador = 'OPERADOR',
    [System.Security.SecureString]$Clave,
    # En modo debug la documentación de la API SÍ está publicada (es lo normal): se omite esa comprobación.
    [switch]$ModoDebug
)

$ErrorActionPreference = 'Stop'
$Url = $Url.TrimEnd('/')
if (-not $Clave) { $Clave = Read-Host -Prompt 'Clave de los usuarios de demostración' -AsSecureString }
$claveTexto = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Clave))

$script:resultados = @()
function Probar([string]$nombre, [scriptblock]$prueba) {
    try {
        $detalle = & $prueba
        $script:resultados += [pscustomobject]@{ Ok = $true; Nombre = $nombre; Detalle = $detalle }
        Write-Host ("  OK     {0}  {1}" -f $nombre, $detalle) -ForegroundColor Green
    }
    catch {
        $script:resultados += [pscustomobject]@{ Ok = $false; Nombre = $nombre; Detalle = $_.Exception.Message }
        Write-Host ("  FALLÓ  {0}  -> {1}" -f $nombre, $_.Exception.Message) -ForegroundColor Red
    }
}
function Llamar([string]$metodo, [string]$ruta, $cuerpo = $null, [string]$token = $null) {
    $parametros = @{ Uri = "$Url$ruta"; Method = $metodo; UseBasicParsing = $true; TimeoutSec = 60 }
    if ($token) { $parametros.Headers = @{ Authorization = "Bearer $token" } }
    if ($null -ne $cuerpo) { $parametros.Body = ($cuerpo | ConvertTo-Json); $parametros.ContentType = 'application/json' }
    try { return Invoke-WebRequest @parametros }
    catch {
        if ($_.Exception.Response) { return [pscustomobject]@{ StatusCode = [int]$_.Exception.Response.StatusCode; Content = '' } }
        throw
    }
}
function Esperar([int]$esperado, $respuesta) {
    if ([int]$respuesta.StatusCode -ne $esperado) { throw "se esperaba $esperado y llegó $($respuesta.StatusCode)" }
}

Write-Host "Verificando $Url ..." -ForegroundColor Cyan
Write-Host ''

Probar 'API y base de datos responden (/api/salud)' {
    $r = Llamar 'GET' '/api/salud'; Esperar 200 $r
    $datos = $r.Content | ConvertFrom-Json
    if ($datos.baseDatos -ne 'ok') { throw 'la API no se conecta a la base de datos' }
    "estado=$($datos.estado)"
}
Probar 'La web carga (página de inicio)' {
    $r = Llamar 'GET' '/'; Esperar 200 $r
    if ($r.Content -notmatch '<gc-root') { throw 'no se encontró la aplicación Angular (¿falta copiar la web a wwwroot?)' }
    'index.html'
}
Probar 'Recargar una ruta de la web no da error (/contratos)' {
    $r = Llamar 'GET' '/contratos'; Esperar 200 $r
    if ($r.Content -notmatch '<gc-root') { throw 'no devolvió la página de inicio' }
    'ok'
}
Probar 'Una ruta de API inexistente da 404 (no la página)' {
    $r = Llamar 'GET' '/api/no-existe'; Esperar 404 $r; 'ok'
}
if ($ModoDebug) {
    Write-Host '  --     La documentación de la API: omitida en modo debug' -ForegroundColor DarkGray
}
else {
    Probar 'La documentación de la API NO está publicada' {
        $r = Llamar 'GET' '/openapi/v1.json'
        if ([int]$r.StatusCode -eq 200 -and $r.Content -match '"openapi"') { throw 'se publicó la documentación (¿ASPNETCORE_ENVIRONMENT=Development?)' }
        'no expuesta'
    }
}
Probar 'Sin sesión, la API protegida responde 401' {
    $r = Llamar 'GET' '/api/clientes'; Esperar 401 $r; 'ok'
}
Probar 'Una clave incorrecta es rechazada (401)' {
    $r = Llamar 'POST' '/api/auth/login' @{ codigo = $UsuarioAdmin; clave = 'clave-incorrecta' }; Esperar 401 $r; 'ok'
}

$tokenAdmin = $null; $tokenOperador = $null
Probar "Inicia sesión como $UsuarioAdmin" {
    $r = Llamar 'POST' '/api/auth/login' @{ codigo = $UsuarioAdmin; clave = $claveTexto }; Esperar 200 $r
    $script:tokenAdmin = ($r.Content | ConvertFrom-Json).token
    if (-not $script:tokenAdmin) { throw 'no llegó el token' }
    'token recibido'
}
Probar "Inicia sesión como $UsuarioOperador" {
    $r = Llamar 'POST' '/api/auth/login' @{ codigo = $UsuarioOperador; clave = $claveTexto }; Esperar 200 $r
    $script:tokenOperador = ($r.Content | ConvertFrom-Json).token
    'token recibido'
}
Probar 'El panel devuelve datos (/api/analiticas/resumen)' {
    $r = Llamar 'GET' '/api/analiticas/resumen' $null $script:tokenAdmin; Esperar 200 $r
    $d = $r.Content | ConvertFrom-Json
    "locales=$($d.totalLocales), ocupados=$($d.localesOcupados)"
}
Probar 'El operador NO puede autorizar contratos (403)' {
    $r = Llamar 'POST' '/api/contratos/1/autorizar' $null $script:tokenOperador; Esperar 403 $r; 'ok'
}
Probar 'El operador NO puede crear empresas (403)' {
    $r = Llamar 'POST' '/api/empresas' @{ codigo = 'XX'; nombre = 'x'; ruc = '20123456789' } $script:tokenOperador; Esperar 403 $r; 'ok'
}

$claveTexto = $null
$fallos = @($script:resultados | Where-Object { -not $_.Ok })
Write-Host ''
if ($fallos.Count -eq 0) {
    Write-Host ("Todo en orden: {0} de {0} comprobaciones correctas." -f $script:resultados.Count) -ForegroundColor Green
    exit 0
}
Write-Host ("{0} de {1} comprobaciones FALLARON. Revise la sección 'Problemas frecuentes' del manual." -f $fallos.Count, $script:resultados.Count) -ForegroundColor Red
exit 1
