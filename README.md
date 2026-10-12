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

## Estado

En construcción. Fases 0 a 2 completas (estructura, base de datos y núcleo técnico con login JWT). Plan en [docs/Arquitectura.md](docs/Arquitectura.md).
