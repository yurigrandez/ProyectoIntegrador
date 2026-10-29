# ProyectoIntegrador

Aplicación para la **gestión de contratos de alquiler de locales comerciales**, con módulo de analíticas.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | .NET 10, API Controllers, C#, Entity Framework |
| Base de datos | SQL Server 2019 |
| Pruebas | Microsoft.AspNetCore.Mvc.Testing |
| Frontend | Angular 21 |

## Estructura del repositorio

```
ProyectoIntegrador/
├── Backend/         # Solución GestionContratos.sln (API en .NET 10 y capas)
├── Frontend/        # Aplicación web Angular 21 (gestion-contratos)
├── ScriptBD/        # Scripts SQL (dbALQUILERES)
├── Manual_Pruebas/  # Guía para probar en modo debug y para instalar en IIS, con scripts
├── docs/            # Arquitectura, configuración, frontend y manuales (usuario y pruebas) en Word
├── Presentacion/    # Especificación con matriz de trazabilidad y evidencias de uso de IA
├── Prompts/         # Definición del proyecto y prompts usados con la IA
└── Imagenes/        # Logos de la empresa
```

## Base de datos

Los scripts están en `ScriptBD/`:

| Script | Contenido |
|---|---|
| `Tablas.sql` | Crea la base de datos `dbALQUILERES` (mantenimiento, negocio, incidencias y auditoría) |
| `Datos.sql` | Catálogos y usuarios iniciales |
| `Vistas.sql` | Vistas para las analíticas |
| `DatosDemo.sql` | Datos de demostración (fechas relativas a hoy) |
| `Instalar.sql` | Ejecuta todo lo anterior (modo SQLCMD): `sqlcmd -S localhost -f 65001 -b -v NombreBD=dbALQUILERES -i Instalar.sql` |

**Atención:** `Instalar.sql` elimina y recrea la base de datos indicada en `NombreBD`.

## Probar e instalar

La carpeta [Manual_Pruebas](Manual_Pruebas/README.md) explica paso a paso cómo probar en **modo debug** y cómo instalar en **IIS** con usuario y clave de SQL Server guardados como variables de entorno, e incluye scripts y una lista de pruebas manuales.

## Configuración y secretos

La cadena de conexión y la clave JWT **no están en el repositorio**: se usan *user-secrets* en desarrollo y variables
de entorno en los demás ambientes. Guía completa en [docs/Configuracion.md](docs/Configuracion.md).

## Ejecutar y probar

Según el caso, desde `Backend/` (API) o `Frontend/gestion-contratos` (web). Guía del frontend en [docs/Frontend.md](docs/Frontend.md).

```bash
dotnet run --project GestionContratos.API    # documentación interactiva en /scalar (solo Desarrollo)
dotnet test                                   # requiere la BD dbALQUILERES_TEST (ver docs/Configuracion.md)
```

Frontend (Node.js 20.19 o superior), con la API corriendo en el perfil `http`:

```bash
npm install && npm start                      # http://localhost:4200
npm test                                      # 181 pruebas con Vitest
```

Usuarios de demostración: `ADMIN` y `OPERADOR`, clave `Demo123*`.

## API disponible

Todos los endpoints (salvo login y salud) requieren el token JWT de `POST /api/auth/login`.

| Recurso | Operaciones | Quién puede escribir |
|---|---|---|
| `api/clientes` | listar (paginado y con búsqueda), obtener, crear, actualizar, desactivar | Crear y editar: cualquier usuario. Desactivar: administrador |
| `api/empresas` | ídem | Solo administrador |
| `api/locales` | ídem, con filtros por empresa, tipo y estado | Solo administrador |
| `api/contratos` | listar con filtros, obtener, crear (borrador), editar borrador, eliminar borrador, `cronograma`, `autorizar`, `rescindir`, `actualizar-estados` | Registrar y editar borradores: cualquier usuario. Autorizar, rescindir, eliminar y actualizar estados: administrador |
| `api/pagos` | listar con filtros, obtener, registrar (total o parcial), `anular` | Registrar: cualquier usuario. Anular: administrador |
| `api/morosidad` | clientes con deuda vencida y detalle de cuotas vencidas por cliente | Solo lectura |
| `api/analiticas/*` | `resumen`, `ocupacion`, `ingresos-mensuales`, `morosidad`, `contratos-por-vencer`, `top-locales`, `top-clientes` (todos con `idEmpresa` opcional) | Solo lectura |
| `api/catalogos/{nombre}` | listas para formularios (tipos de documento, monedas, estados...) | Solo lectura |

Contratos: el código se genera solo (`CON-AAAA-NNNN`), nace en *borrador*, lo autoriza un administrador distinto de quien
lo registró y al autorizarse se genera el cronograma mensual (la primera cuota se cobra completa) y se ocupa el local.
Cada pago se aplica a una cuota y no puede superar su saldo; la cuota pasa a *pago parcial* o *pagada* y la mora se calcula a la fecha de hoy.
Los contratos vencidos y el estado de los locales se actualizan al iniciar la API y cada 6 horas.

Reglas principales: los códigos de empresas, locales y clientes los genera el sistema al guardar (`EMP-NNNN`, `LOC-NNNN`, `CLI-NNNN`) y no se pueden editar, documento válido por tipo (DNI 8 dígitos, RUC 11), un cliente, local o empresa
con contratos o locales activos no se puede desactivar, y el estado *Ocupado* de un local lo define el contrato vigente.

## Estado

En construcción. Las 8 fases del plan están completas: backend (estructura, base de datos, núcleo técnico con login JWT, maestros, contratos, cronograma, pagos y analíticas) y frontend Angular 21 (login, panel con gráficos, clientes, empresas, locales, contratos, pagos y deudas). Plan en [docs/Arquitectura.md](docs/Arquitectura.md).
