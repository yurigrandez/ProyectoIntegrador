# Frontend (Angular 21)

Aplicación web de **DA Soluciones e Inversiones** para gestionar contratos de alquiler. Vive en `Frontend/gestion-contratos`.

## Cómo ejecutarla

Requisitos: Node.js 20.19 o superior (se probó con 24 LTS) y la API en marcha. Desde `Frontend/gestion-contratos`:

```bash
npm install
npm start          # http://localhost:4200
npm test           # pruebas unitarias y de componentes (Vitest)
npm run build      # compilación de producción en dist/
```

En desarrollo el archivo `proxy.conf.json` reenvía `/api` a `http://localhost:5099` (la API con el perfil `http`), así que
el navegador siempre llama a la misma dirección y no hay problemas de CORS. La API debe estar corriendo antes de iniciar sesión
(`dotnet run --project GestionContratos.API --launch-profile http` desde `Backend/`).

**Producción:** la aplicación llama a `/api/...` con ruta relativa, por lo que la web y la API deben compartir dominio. La forma más simple es la que usa el manual de IIS:
la **API sirve la web compilada** desde su carpeta `wwwroot` (un solo sitio, un solo puerto; las pantallas se recargan sin error 404 y las rutas `/api` inexistentes siguen dando 404).
`Manual_Pruebas/scripts/publicar.ps1` compila ambas y las deja juntas. El token y la cadena de conexión siguen siendo secretos del servidor (ver `Configuracion.md`); el frontend no guarda ninguno.

## Pantallas

| Ruta | Para qué sirve | Quién |
|---|---|---|
| `/login` | Ingresar con usuario y contraseña | Todos |
| `/panel` | Indicadores, gráficos y acciones frecuentes | Todos |
| `/contratos`, `/contratos/nuevo`, `/contratos/:id` | Listar, registrar y revisar contratos; ver cuotas, registrar pagos | Todos |
| `/contratos/:id` (acciones) | Autorizar, rescindir y eliminar borradores | Solo administrador |
| `/pagos` | Historial de pagos y registro de pagos nuevos | Todos (anular: administrador) |
| `/deudas` | Quién debe y cuánto; cobrar cuotas vencidas | Todos |
| `/clientes` | Alta, edición y consulta de clientes | Todos (eliminar: administrador) |
| `/locales`, `/empresas` | Consulta para todos; alta, edición y baja solo para administradores | Administrador |

## Pensada para aprender rápido

- **Cada pantalla explica qué se puede hacer** con una frase bajo el título, y los formularios van en pasos numerados con ayudas cortas.
- **Acciones guiadas:** el panel ofrece "¿Qué desea hacer?"; un contrato en borrador dice cuál es el siguiente paso; los botones deshabilitados explican por qué.
- **Lenguaje sencillo:** los errores del servidor se traducen ("El monto no puede ser mayor que lo que falta pagar") y los vacíos proponen una acción.
- **Confirmaciones** antes de acciones que no se pueden deshacer, con una explicación de qué va a pasar.
- **Resumen en vivo** al crear un contrato (pago mensual, duración y total) y prellenado al registrar pagos (cuota más antigua, saldo completo, efectivo, hoy).
- **Responsiva:** menú lateral en pantalla grande y cajón en el celular; las tablas se vuelven tarjetas; sin desplazamiento horizontal desde 360 px.
- **Accesible:** etiquetas enlazadas a cada campo, foco visible, navegación con teclado, ventanas que atrapan el foco, estados con icono y texto (nunca solo color), contraste AA, respeto a "reducir movimiento".

## Identidad visual

Colores tomados del logo: **azul marino `#1C3C4C`** y **azul acero `#3C7494`**. Los botones usan `#2F6F8F` (un paso más oscuro que el azul de marca) para que el
texto blanco tenga contraste 5.5:1. Los tokens están en `src/styles.scss`; el logo completo (menú lateral y login) y el corto (barra en el celular) están en `public/`.

### Gráficos

Siguen una guía de visualización de datos y su paleta se validó con un verificador (separación para daltonismo y contraste):

| Gráfico | Forma | Color |
|---|---|---|
| Ingresos mensuales | Columnas: lo esperado como contexto, lo cobrado como protagonista | Gris `#7F8F9B` frente a azul `#2F78B0` |
| Ocupación de locales | Una barra dividida (parte de un todo) con leyenda de números | Azul / naranja / violeta |
| Deuda por antigüedad | Barras ordenadas, de un solo tono (más oscuro = más antiguo) | Escala de azul `#7FABC8` a `#1C3C4C` |
| Tops de clientes y locales | Barras horizontales, valor al final | Azul |

Todos tienen leyenda visible, información al pasar el cursor **o** enfocar con el teclado, y un botón **"Ver como tabla"** con los mismos datos.

## Estructura

```
src/app/
  core/       api (servicios HTTP tipados), auth (sesión, interceptor, guardas), ui (avisos y confirmaciones)
  shared/     componentes reutilizables (modal, paginación, campo, estado, iconos, KPI, gráficos), formatos, fechas y validadores
  layout/     estructura con menú lateral y barra superior
  features/   una carpeta por pantalla (login, panel, clientes, empresas, locales, contratos, pagos, deudas)
```

Se usan componentes independientes, señales, flujo de control nativo (`@if`, `@for`), detección de cambios sin zone.js y carga diferida por ruta.

## Seguridad

- El token JWT se guarda solo en `sessionStorage` (se pierde al cerrar la pestaña). Si el servidor responde 401, se cierra la sesión y se explica por qué.
- Las rutas de edición de administradores están protegidas con una guarda además de ocultarse en pantalla; el servidor es quien impone los permisos de verdad.
- Después de iniciar sesión solo se vuelve a direcciones internas (nunca a un sitio externo).
- Los textos que vienen de la API se muestran con enlaces de Angular (escapados), nunca como HTML.

## Pruebas

181 pruebas con **Vitest**: formatos y fechas (reglas iguales a las del servidor), validadores, escalas de gráficos, errores de la API, sesión, interceptor y guardas, y las pantallas
principales (login, clientes, registro de pagos, formulario de contrato) contra una API simulada. Se comprobó que detectan errores introduciendo fallos a propósito.
