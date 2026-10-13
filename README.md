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
├── Backend/     # Solución GestionContratos.sln (API en .NET 10 y capas)
├── docs/        # Arquitectura, MVP y plan de fases
├── Frontend/    # Aplicación Angular 21
├── ScriptBD/    # Scripts SQL (dbALQUILERES)
└── Prompts/     # Definición del proyecto y prompts
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

## Configuración y secretos

La cadena de conexión y la clave JWT **no están en el repositorio**: se usan *user-secrets* en desarrollo y variables
de entorno en los demás ambientes. Guía completa en [docs/Configuracion.md](docs/Configuracion.md).

## Ejecutar y probar (desde `Backend/`)

```bash
dotnet run --project GestionContratos.API    # documentación interactiva en /scalar (solo Desarrollo)
dotnet test                                   # requiere la BD dbALQUILERES_TEST (ver docs/Configuracion.md)
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
| `api/catalogos/{nombre}` | listas para formularios (tipos de documento, monedas, estados...) | Solo lectura |

Contratos: el código se genera solo (`CON-AAAA-NNNN`), nace en *borrador*, lo autoriza un administrador distinto de quien
lo registró y al autorizarse se genera el cronograma mensual (la primera cuota se cobra completa) y se ocupa el local.
Los contratos vencidos y el estado de los locales se actualizan al iniciar la API y cada 6 horas.

Reglas principales: códigos únicos, documento válido por tipo (DNI 8 dígitos, RUC 11), un cliente, local o empresa
con contratos o locales activos no se puede desactivar, y el estado *Ocupado* de un local lo define el contrato vigente.

## Estado

En construcción. Fases 0 a 4 completas (estructura, base de datos, núcleo técnico con login JWT, maestros, contratos y cronograma). Plan en [docs/Arquitectura.md](docs/Arquitectura.md).
