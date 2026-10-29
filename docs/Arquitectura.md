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
- **Mora:** no se guarda como estado de la cuota; se calcula comparando `FechaVencimiento` con la fecha actual (vista `vwCRONOGRAMA_SALDOS`). Los estados de cuota son pendiente, pago parcial y pagada.
- **Primera cuota (decidido):** se cobra completa, porque el local se entrega al iniciar la vigencia. Si el día de pago del primer mes ya pasó al iniciar, la primera cuota vence el día de inicio. El último mes también se cobra completo y ninguna cuota vence después del fin del contrato.
- **Cambio de día de pago:** si cambia a mitad del contrato, afecta solo a las cuotas pendientes (pendiente de implementar junto con las adendas).

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
| **1. Base de datos** | Datos semilla de catálogos (incluye `PEN`), datos de demostración realistas (locales, clientes, contratos en distintos estados y pagos) y consultas o vistas para analíticas. | `ScriptBD/Instalar.sql` crea la BD completa (tablas, semillas, vistas y datos de demostración) sin errores. |
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

## 6. Reglas de contratos implementadas (fase 4)

- **Código:** `CON-AAAA-NNNN`, generado de forma atómica desde `tabSECUENCIA` (una secuencia por año). Un número consumido por una operación fallida no se reutiliza, por lo que puede haber saltos.
- **Códigos de maestros:** empresas, locales y clientes reciben un código automático al guardar (`EMP-NNNN`, `LOC-NNNN`, `CLI-NNNN`) desde `tabSECUENCIA`, con una sola serie por tabla (sin reinicio anual). El formulario lo muestra sin permitir editarlo, también al editar el registro; si la API recibe un código, lo ignora.
- **Ciclo de vida:** `BOR` (borrador, editable y eliminable) → `VIG` (autorizado) → `VEN` (plazo terminado) o `RES` (rescindido).
- **Solapamiento:** un local no puede tener dos contratos (borrador o vigente) con fechas que se crucen; al autorizar se vuelve a verificar contra los vigentes.
- **Autorización:** solo un administrador, distinto del usuario que registró el contrato. Un contrato con plazo ya terminado no se puede autorizar. Al autorizar se genera el cronograma, se registra un evento en `tabEVENTOS` y, si el contrato ya inició, el local pasa a ocupado.
- **Cronograma:** un grupo de cuotas por mes y por concepto con monto mayor a cero (alquiler, luz, agua, mantenimiento, otros), todas en estado pendiente.
- **Rescisión:** solo de contratos vigentes, con fecha efectiva entre el inicio y hoy. Se acorta el fin del contrato, se anulan las cuotas posteriores sin pagos y se libera el local.
- **Vencimientos:** una tarea de fondo marca como vencidos los contratos cuyo plazo terminó y ajusta ocupado/disponible de los locales al iniciar la API y cada `Contratos:HorasEntreActualizaciones` horas (6 por defecto). Se puede desactivar con `Contratos:ActualizacionAutomatica=false` y también ejecutar a pedido con `POST /api/contratos/actualizar-estados`.
- **Pendiente para fases siguientes:** pagos aplicados a cuotas (fase 5) y el cambio de día de pago a mitad de contrato (adendas).

## 7. Reglas de pagos y morosidad implementadas (fase 5)

- **Aplicación:** cada pago se aplica a una cuota del cronograma. Puede ser parcial, pero nunca mayor al saldo de la cuota (el sobrepago se rechaza). La moneda del pago es la del contrato.
- **Estado de la cuota:** pendiente (`PEN`) sin pagos, pago parcial (`PAR`) si queda saldo y pagada (`PAG`) cuando el saldo es cero. Se recalcula al registrar y al anular pagos.
- **Fecha de pago:** por defecto hoy; no puede ser futura ni anterior al inicio del contrato.
- **Concurrencia:** al registrar o anular un pago se bloquea la fila de la cuota dentro de una transacción (`UPDLOCK`). Dos pagos simultáneos sobre la misma cuota se atienden uno tras otro, así el saldo validado es el real. Hay pruebas que lo verifican.
- **Anulación:** solo el administrador, con motivo. Es una baja lógica: el pago deja de contar y la cuota vuelve al estado que corresponde. No se puede anular un pago ya asociado a un comprobante.
- **Auditoría:** registrar y anular pagos deja un evento en `tabEVENTOS`.
- **Morosidad:** no se guarda. Una cuota está en mora si su vencimiento es anterior a hoy y todavía tiene saldo. `GET /api/morosidad` agrupa por cliente (cuotas vencidas, monto y máximo de días de atraso) y `GET /api/morosidad/{idCliente}` detalla las cuotas. Los resultados coinciden con la vista `vwMOROSIDAD`.
- **Pendiente:** un pago que cubra varias cuotas a la vez (hoy se registra un pago por cuota) y la asociación de pagos a comprobantes (facturación, posterior al MVP).

## 8. Analíticas del dashboard implementadas (fase 6)

Endpoints de solo lectura bajo `api/analiticas`, para cualquier usuario autenticado. Todos aceptan `idEmpresa` (si no existe responden 404; sin él consolidan todas las empresas) y se calculan a la fecha de hoy.

| Endpoint | Qué devuelve |
|---|---|
| `resumen` | Indicadores del encabezado: locales (total, ocupados, disponibles, en mantenimiento, % de ocupación), contratos vigentes, esperado y cobrado del mes con su % de cobranza, deuda vencida (monto, cuotas, clientes) y contratos por vencer a 30, 60 y 90 días (acumulados) |
| `ocupacion` | Por empresa: total, ocupados, en mantenimiento, disponibles y % de ocupación. *Ocupado* = contrato vigente que cubre hoy (no depende del estado guardado del local) |
| `ingresos-mensuales` | Mes a mes: esperado (cuotas que vencen en el mes), cobrado (pagos recibidos en el mes), diferencia y % de cobranza. Rango por defecto: 12 meses hasta el actual; máximo 60; incluye los meses sin movimiento con ceros |
| `morosidad` | Deuda vencida total, cuotas, clientes y mayor atraso, con la antigüedad en rangos de 1-30, 31-60, 61-90 y más de 90 días |
| `contratos-por-vencer` | Contratos vigentes que terminan dentro de `dias` (1 a 365, 90 por defecto), del más próximo al más lejano |
| `top-locales`, `top-clientes` | Los que más han cobrado en el período (`desde`/`hasta` opcionales; sin ellos, todo el historial). `top` de 1 a 50, 5 por defecto |

**Decisión:** el *cobrado* de un mes cuenta los pagos recibidos en ese mes, aunque correspondan a cuotas de meses anteriores; por eso el % de cobranza puede superar 100.

**Verificación:** con los datos de demostración, los resultados de la API coinciden con los de las vistas SQL de la fase 1 (`vwOCUPACION_LOCALES`, `vwMOROSIDAD`, `vwINGRESOS_MENSUALES`, `vwCONTRATOS_POR_VENCER`, `vwINGRESOS_POR_LOCAL`, `vwINGRESOS_POR_CLIENTE`). Las pruebas de integración crean su propia empresa y comprueban valores exactos.

## 9. Frontend implementado (fase 7)

Aplicación Angular 21 (componentes independientes, señales, sin zone.js, carga diferida) con los colores del logo de la empresa, diseño responsivo (menú en cajón y tablas como tarjetas en el celular) y pantallas para todo el flujo del MVP: login, panel con gráficos, clientes, empresas, locales, contratos (alta, autorización, rescisión, cuotas), pagos y deudas vencidas.
Detalles de uso, estructura, decisiones de diseño y accesibilidad en [Frontend.md](Frontend.md).

Con esta fase el MVP queda completo: se puede recorrer la demostración de punta a punta (el operador registra un contrato, el administrador lo autoriza, se registran pagos y el panel refleja los cambios).

## 10. Guía de pruebas e instalación (Manual_Pruebas)

La carpeta `Manual_Pruebas` reúne la guía para probar en modo debug y para instalar en IIS (usuario y clave de SQL Server en variables de entorno del grupo de aplicaciones), con scripts de publicación, verificación automática y una lista de pruebas manuales.
Para el despliegue en IIS la API sirve también la web compilada (`wwwroot`), por lo que se instala un solo sitio.
