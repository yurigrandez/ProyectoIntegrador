# Arquitectura, MVP y plan de fases

Documento de referencia del proyecto **GestionContratos**: gestión de contratos de alquiler de locales comerciales, con analíticas.

## 1. Arquitectura en N capas

**Solución:** `GestionContratos.sln`, en la carpeta `Backend/`. El frontend Angular vive aparte, en `Frontend/`.

| Proyecto | Responsabilidad |
|---|---|
| `GestionContratos.API` | Controllers, `Program.cs`, autenticación JWT, manejo global de errores, Swagger y CORS. Es la raíz de composición (registra la inyección de dependencias). No contiene lógica de negocio. |
| `GestionContratos.Negocio` | Servicios, reglas de negocio (vigencia, solapamiento de contratos, generación del cronograma, cálculo de morosidad), validaciones y consultas analíticas. Define las interfaces que necesita de terceros. |
| `GestionContratos.Datos` | `DbContext` de EF, configuraciones por entidad, repositorios y Unit of Work. Acceso a SQL Server. |
| `GestionContratos.Entidades` | Clases que mapean las tablas de `ScriptBD/Tablas.sql`. No depende de ningún otro proyecto. |
| `GestionContratos.DTOs` | Objetos de entrada y salida de la API (requests, responses, filtros, resultados de analíticas). Evita exponer las entidades. |
| `GestionContratos.Comun` | Enumeraciones, constantes, excepciones propias, helpers y configuración compartida. |
| `GestionContratos.Integraciones` | Implementaciones de las interfaces de `Negocio` para servicios de terceros (facturación electrónica, correo, etc.). Se crea vacío en la fase 0 y se llena después del MVP. |
| `GestionContratos.Pruebas` | Pruebas unitarias de `Negocio` y pruebas de integración de la API con `Microsoft.AspNetCore.Mvc.Testing`. |

### Dependencias (en un solo sentido)

```
API ──► Negocio ◄── Integraciones   (Integraciones implementa interfaces de Negocio)
         │
         ▼
       Datos ──► Entidades
API, Negocio, Datos, Integraciones ──► DTOs, Comun
Pruebas ──► API, Negocio
```

- La API nunca habla directo con `Datos`.
- Las entidades no conocen a ningún otro proyecto.
- **Servicios de terceros:** `Negocio` define interfaces (por ejemplo `IFacturacionElectronica`) e `Integraciones` las implementa. La API las conecta al arrancar. No se agrega una capa entre `Negocio` y `API`, porque la API se saltaría las reglas de negocio.

### Decisiones técnicas

- **Base de datos primero:** `Tablas.sql` es la fuente de verdad. Las entidades se generan con `dotnet ef dbcontext scaffold` y se ajustan a mano.
- **Nombres:** las tablas `tabXXX` se mapean a clases en singular y PascalCase (`tabCONTRATOS` → `Contrato`).
- **Baja lógica:** `FechaDesactivacion` se trata como borrado lógico, con un filtro global de EF.
- **Auditoría:** `FechaCreacion` y `FechaModificacion` se llenan de forma centralizada en `Datos`. `tabEVENTOS` se alimenta desde `Negocio`.
- **Secuencias:** los códigos (por ejemplo `Codigo` del contrato) salen de `tabSECUENCIA`, con control de concurrencia.
- **Seguridad:** la clave de `tabUSUARIOS` se guarda con hash (PBKDF2 o BCrypt). Los endpoints se protegen por rol (`tabTIPO_USUARIOS`).
- **Cadena de conexión:** el mecanismo para guardar las credenciales se define durante el MVP (fase 2). Mientras tanto, nada con credenciales se sube al repositorio.
- **Frontend:** Angular 21, módulos por funcionalidad, servicios HTTP tipados y guards de autenticación, consumiendo la API vía Swagger/OpenAPI.

## 2. Supuestos y reglas de negocio del MVP

| Tema | Decisión |
|---|---|
| Moneda | Soles (PEN) como moneda local. Dato semilla `PEN` en `tabTIPO_MONEDAS`. Se mantiene `IdTipoMoneda` en las tablas para admitir otras monedas más adelante. |
| Cronograma | Cuotas mensuales. El día de pago varía por contrato (por ejemplo 1 o 2, 15 o 16) y se guarda en `tabCONTRATOS.DiaPago` (1 a 31). |
| Autorización | El contrato lo registra un usuario y lo revisa y autoriza un segundo usuario, normalmente el dueño o encargado. `IdUsuarioAutoriza` debe ser distinto de `IdUsuarioRegistra` y pertenecer a un tipo de usuario con permiso de autorizar. |
| Pruebas | Se ejecutan sobre SQL Server local, no en memoria. Usan una BD separada, `dbALQUILERES_TEST`, que se recrea o limpia antes de cada ejecución. Nunca sobre `dbALQUILERES`. |
| Cadena de conexión | Se define durante el MVP. |

### Detalles del cronograma a resolver

- **Meses cortos:** si `DiaPago` es 30 o 31, en los meses más cortos se usa el último día del mes.
- **Primera cuota:** definir si el primer mes se cobra completo o prorrateado cuando el contrato no empieza en el día de pago.
- **Cambio de día de pago:** si cambia a mitad del contrato, afecta solo a las cuotas pendientes.

## 3. MVP

**Mensaje de valor:** "Sé qué locales tengo ocupados, cuánto me deben y qué contratos vencen pronto, en una sola pantalla".

### Incluye

1. **Login y roles:** administrador (dueño o encargado, autoriza) y operador (registra).
2. **Maestros esenciales:** empresas, locales y clientes con CRUD. Los catálogos (tipos, estados, monedas, medios de pago, conceptos) entran como datos semilla.
3. **Contratos:**
   - Alta con validación de que no se solape con otro contrato del mismo local.
   - Autorización por un segundo usuario.
   - Estados: borrador, vigente, vencido y rescindido.
4. **Cronograma de cobros:** se genera automáticamente al autorizar el contrato, según `DiaPago`.
5. **Registro de pagos:** cada pago se aplica a una cuota y actualiza su estado (pendiente, pagada, vencida).
6. **Dashboard de analíticas:**
   - Ocupación de locales: ocupados vs. disponibles.
   - Ingresos esperados vs. cobrados por mes.
   - Morosidad: monto vencido y clientes con deuda.
   - Contratos por vencer en 30, 60 y 90 días.
   - Top de locales o clientes por ingreso.

### Fuera del MVP

Comprobantes y facturación electrónica, adendas, garantías, documentos adjuntos, incidencias, auditoría visible, notificaciones por correo, reportes exportables y gestión de roles y permisos. Las tablas ya existen en la BD y se activan en una segunda etapa.

### Guion de demo (unos 10 minutos)

1. Entrar con datos de demostración ya cargados.
2. Mostrar el dashboard.
3. Crear un cliente y un contrato en un local libre.
4. Autorizar el contrato con el segundo usuario.
5. Ver el cronograma generado.
6. Registrar un pago.
7. Volver al dashboard y ver cómo cambian los indicadores.

## 4. Fases hasta el MVP

| Fase | Objetivo | Entregable / criterio de salida |
|---|---|---|
| **0. Preparación** | Solución con los 8 proyectos (incluido `Integraciones`, vacío), referencias, `.gitignore`, convenciones y pipeline básico de build. | `dotnet build` en verde y estructura publicada en GitHub. |
| **1. Base de datos** | Datos semilla de catálogos (incluye `PEN`), datos de demostración realistas (locales, clientes, contratos en distintos estados y pagos) y consultas o vistas para analíticas. | Script de semillas que se ejecuta sin errores. |
| **2. Núcleo técnico** | Entidades, `DbContext`, repositorios, Unit of Work, auditoría automática, manejo de errores, JWT, Swagger, **definición del manejo seguro de la cadena de conexión** y BD de pruebas `dbALQUILERES_TEST`. | Login funcional y una prueba de integración que corre contra la BD de pruebas. |
| **3. Maestros** | CRUD de empresas, locales y clientes (API y pruebas). | Pruebas de integración en verde. |
| **4. Contratos y cronograma** | Alta, autorización por segundo usuario, estados y generación del cronograma con `DiaPago`. | Reglas de negocio cubiertas por pruebas unitarias. |
| **5. Pagos** | Registro de pagos, aplicación a cuotas y actualización de estados y morosidad. | Escenarios de pago parcial, total y vencido probados. |
| **6. Analíticas** | Endpoints del dashboard (ocupación, ingresos, morosidad, vencimientos, top). | Resultados contrastados con los datos de demostración. |
| **7. Frontend** | Proyecto Angular 21 con login, maestros, contratos, pagos y dashboard con gráficos. | Flujo completo del guion de demo ejecutable de punta a punta. |
| **8. Cierre del MVP** | Pruebas de regresión, ajustes de usabilidad, README con instrucciones de instalación y ensayo de la demo. | Demo repetible desde cero con un solo script de BD. |

Las fases 3 a 6 pueden avanzar en paralelo con la 7 una vez que existan los contratos de la API (DTOs y Swagger). La fase 2 no puede saltarse, porque todo lo demás se apoya en ella.

## 5. Después del MVP

Facturación electrónica (implementada en `Integraciones`), adendas, garantías, documentos de contrato, incidencias, notificaciones y reportes exportables.
