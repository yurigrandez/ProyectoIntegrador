# 3. Lista de pruebas manuales

Recorra estas pruebas **en orden** sobre la instalación que quiera validar (modo debug en `http://localhost:4200` o IIS en `http://localhost:8080`). Cada prueba dice qué hacer y **qué debe pasar**. Marque `[x]` cuando el resultado sea el esperado y anote lo que vea cuando no lo sea.

**Antes de empezar**
- Base de datos recién instalada con los datos de demostración (`Instalar.sql`), para que las cifras coincidan con lo descrito. Los datos usan fechas relativas al día de instalación.
- Dos navegadores o una ventana normal y una de incógnito: así puede tener a **ADMIN** y a **OPERADOR** a la vez.
- Para contrastar cifras con la base de datos: `scripts\consultas_verificacion.sql` (ver sección F).
- Antes de la lista, ejecute la prueba rápida: `scripts\verificar.ps1` (debe dar todo en orden).

> **Cómo entrar:** usuario `ADMIN` u `OPERADOR`; la clave de demostración está en el [README principal](../README.md).

---

## A. Acceso y sesión

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| A1 | Entrar como **ADMIN** con la clave correcta | Se abre el **Panel** con «Hola, Carlos» y el rol *Administrador* arriba a la derecha | [ ] |
| A2 | Cerrar sesión (**Salir**) y entrar con una clave equivocada | Mensaje rojo «Usuario o clave incorrectos.» y se queda en el login | [ ] |
| A3 | Pulsar **Ingresar** con los campos vacíos | Aparece «Este dato es obligatorio.» bajo cada campo; no se envía nada | [ ] |
| A4 | Sin sesión, escribir en la barra de direcciones `…/contratos` | Lleva al login; al entrar vuelve a **Contratos** (no al Panel) | [ ] |
| A5 | Entrar y pulsar **Salir**; luego el botón *Atrás* del navegador | Vuelve al login y no muestra datos; al recargar sigue pidiendo ingreso | [ ] |
| A6 | Entrar, cerrar la pestaña y abrir la dirección en una pestaña nueva | Pide ingresar otra vez (la sesión no sobrevive al cierre de la pestaña) | [ ] |
| A7 | **Sesión vencida.** Entrar, abrir F12 → *Consola* y pegar: `const s=JSON.parse(sessionStorage['gc.sesion']); s.expira='2000-01-01T00:00:00Z'; sessionStorage['gc.sesion']=JSON.stringify(s); location.reload()` | Vuelve al login y pide ingresar de nuevo (la web detecta que la sesión venció antes de llamar al servidor) | [ ] |
| A8 | **Token alterado.** Entrar, abrir F12 → *Consola* y pegar: `const s=JSON.parse(sessionStorage['gc.sesion']); s.token=s.token.slice(0,-3)+'abc'; sessionStorage['gc.sesion']=JSON.stringify(s); location.reload()` | Tras recargar, el servidor rechaza el token alterado: se cierra la sesión y lleva al login con el aviso «Su sesión terminó» | [ ] |

## B. Como OPERADOR

Entre con **OPERADOR**.

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| B1 | Mirar el menú | Ve Panel, Contratos, Pagos, Deudas, Clientes, Locales y Empresas | [ ] |
| B2 | Abrir **Empresas** y **Locales** | Aviso «Solo consulta»; **no** hay botones *Nueva*, *Editar* ni eliminar | [ ] |
| B3 | Escribir en la barra de direcciones `…/empresas/nueva` | Mensaje «Esa pantalla es solo para administradores» y vuelve al Panel | [ ] |
| B4 | **Clientes → Nuevo cliente**: ver que el **Código** está vacío y no se puede escribir («Se genera al guardar»); tipo **DNI**, número `12345678`, nombre y apellido; **Guardar** | Mensaje «Cliente CLI-… registrado» con el código que asignó el sistema (anótelo: se usa en B10 y B12); aparece en la lista | [ ] |
| B5 | Repetir con DNI de **7 dígitos** | Error «El DNI debe tener 8 dígitos» bajo el campo; no se guarda | [ ] |
| B6 | Abrir **Editar** del cliente creado en B4 | El **Código** se muestra con su valor (CLI-…) y la caja no se puede editar | [ ] |
| B7 | Repetir con el **mismo DNI** | Mensaje «Ya existe un cliente con DNI 12345678» | [ ] |
| B8 | Escribir un correo inválido (`abc`) | «Escriba un correo válido…» | [ ] |
| B9 | Tipo de documento **RUC** | El campo «Nombres» cambia a «Razón social» y desaparecen los apellidos; pide 11 dígitos | [ ] |
| B10 | En la lista de clientes buscar el número del código asignado en B4 (por ejemplo «0001» si fue CLI-0001) | Se filtra tras una breve pausa y muestra ese cliente | [ ] |
| B11 | Mirar la lista de clientes | **No** hay botón de eliminar (solo lo ve un administrador) | [ ] |
| B12 | **Contratos → Nuevo contrato**: el cliente creado en B4, un local **disponible** (por ejemplo LOC-006), inicio el día 1 de este mes, duración 12 meses, día de pago 5, alquiler 1500, mantenimiento 100 | El resumen muestra **S/ 1,600.00** al mes, **12 meses** y **S/ 19,200.00**; la fecha de fin se calcula sola | [ ] |
| B13 | **Guardar** el contrato | Aviso «Contrato CON-… guardado como borrador»; en el detalle estado **Borrador** y mensaje «Avise a un administrador»; **no** hay botón *Autorizar* | [ ] |
| B14 | Abrir el selector de local al crear otro contrato | El local en **mantenimiento** (LOC-012) aparece desactivado | [ ] |
| B15 | **Clientes → Nuevo cliente**: escribir un nombre y, sin guardar, pulsar otra opción del menú (por ejemplo **Contratos**) | Aparece la ventana «Salir sin guardar» que pregunta si desea salir sin guardar los cambios, con los botones **Sí** y **No** | [ ] |
| B16 | En esa ventana pulsar **No** (o la **X**) | La ventana se cierra y se queda en el formulario con lo que escribió | [ ] |
| B17 | Volver a pulsar otra opción del menú y elegir **Sí** | Va a la opción elegida y el cliente no se guarda | [ ] |
| B18 | **Clientes → Editar** un cliente, no cambiar nada y pulsar **Cancelar** | Sale sin preguntar nada | [ ] |

## C. Como ADMINISTRADOR

Entre con **ADMIN** (en la otra ventana).

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| C1 | Abrir el contrato **borrador** creado en B12 y pulsar **Autorizar** | Ventana de confirmación que explica qué pasará; al confirmar: estado **Vigente**, aparecen las cuotas (12 meses de alquiler y de mantenimiento = 24 filas) y el local queda **Ocupado** | [ ] |
| C2 | Mirar las cuotas | La del primer mes figura **Vencida** con sus días de atraso si el día 5 ya pasó; el resto **Pendiente** | [ ] |
| C3 | Como ADMIN, **registrar** un contrato nuevo (otro local libre) y abrirlo | El botón **Autorizar está desactivado** y dice que debe autorizarlo otro administrador (usted lo registró) | [ ] |
| C4 | Crear un contrato para el **mismo local y fechas** que uno vigente | Error del servidor «…se cruza con esas fechas» | [ ] |
| C5 | Abrir un contrato en borrador y pulsar **Eliminar borrador** | Confirmación; al aceptar desaparece de la lista | [ ] |
| C6 | Contrato **vigente** → **Rescindir**: fecha de hoy y un motivo | Estado **Rescindido**; las cuotas futuras sin pagos desaparecen; el local vuelve a **Disponible** | [ ] |
| C7 | Rescindir con fecha **futura** | Error «no puede ser posterior a hoy» | [ ] |
| C8 | **Locales → Nuevo local** con todos los datos | Se crea con un código LOC-… asignado por el sistema y en estado *Disponible* | [ ] |
| C9 | Editar un local **ocupado** | El estado no se puede cambiar y aparece el cuadro «Este local está ocupado» | [ ] |
| C10 | Intentar eliminar un local con contrato vigente | Mensaje «No se puede desactivar un local con contratos borrador o vigentes» | [ ] |
| C11 | Intentar eliminar la empresa de demostración | Mensaje «…tiene locales activos» | [ ] |
| C12 | **Empresas → Nueva empresa** con RUC `123` | Error de formato del RUC; con 11 dígitos que empiecen con 20, se crea con un código EMP-… asignado por el sistema | [ ] |
| C13 | **Empresas**, **Locales** y **Contratos** (nuevo o editar): cambiar un dato y pulsar **Cancelar** u otra opción del menú | Aparece la misma ventana «Salir sin guardar» con **Sí** y **No**; después de **Guardar** correctamente ya no pregunta | [ ] |

## D. Pagos

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| D1 | En un contrato vigente, **Pagar** una cuota que **aún no venció** (por ejemplo la del mes siguiente) de 1000 y registrar **400** | Aviso «Pago de S/ 400.00 registrado»; la cuota queda **Pago parcial** y «Falta» S/ 600. (Una cuota que ya estaba vencida sigue mostrándose **Vencida**, con lo pagado y lo que falta) | [ ] |
| D2 | **Pagar** esa misma cuota con lo que falta (**600**) | Pasa a **Pagada**, falta S/ 0 | [ ] |
| D3 | Intentar pagar **más** de lo que falta | El campo marca error «no puede ser mayor que lo que falta pagar» y no deja guardar | [ ] |
| D4 | Intentar una **fecha futura** | Error «La fecha de pago no puede ser futura» | [ ] |
| D5 | Monto `0` o negativo | Error; no se guarda | [ ] |
| D6 | Como ADMIN, en **Pagos**, **Anular** el pago de 600 con un motivo | Aviso «Pago anulado»; la cuota vuelve a **Pago parcial** (falta 600), o a **Vencida** si ya pasó su fecha | [ ] |
| D7 | Como OPERADOR, mirar la lista de pagos | **No** aparece el botón *Anular* | [ ] |
| D8 | **Pagos → Registrar un pago**: elegir contrato y luego una cuota | Solo ofrece cuotas con saldo, de la más antigua a la más reciente; elegir una llena el monto con su saldo | [ ] |
| D9 | **Dos personas a la vez.** En dos ventanas abrir el pago de la **misma cuota** (saldo completo) y registrar el pago en ambas, una justo después de otra | La primera se registra; la segunda recibe «La cuota ya está pagada por completo» (nunca se paga de más) | [ ] |

## E. Deudas vencidas

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| E1 | Abrir **Deudas vencidas** | Tres tarjetas (total, clientes, cuotas) y la lista ordenada de mayor a menor deuda | [ ] |
| E2 | **Ver cuotas** de un cliente | Se despliega el detalle con días de atraso y saldo de cada cuota | [ ] |
| E3 | **Cobrar** una cuota y registrar el pago completo | La cuota sale del detalle y la deuda del cliente baja; si era la última, el cliente desaparece de la lista | [ ] |
| E4 | Contrastar con la base de datos | Las cifras coinciden con las de `consultas_verificacion.sql` (sección A2) | [ ] |

## F. Panel

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| F1 | Abrir el **Panel** y comparar con `consultas_verificacion.sql` (sección A) | Locales ocupados, cobrado del mes, deuda vencida y contratos por vencer **coinciden** | [ ] |
| F2 | Pasar el mouse **y** usar la tecla **Tab** sobre las columnas, barras y tramos | Aparece el detalle (valores, porcentaje) en ambos casos | [ ] |
| F3 | Pulsar **Ver como tabla** en cada gráfico | Muestra los mismos datos en una tabla; **Ver gráfico** vuelve | [ ] |
| F4 | Registrar un pago y volver al Panel | «Cobrado este mes» y la deuda reflejan el cambio | [ ] |
| F5 | Probar los botones de **¿Qué desea hacer?** | Cada uno lleva a la pantalla o ventana correcta | [ ] |
| F6 | Si hay más de una empresa, usar «Ver datos de» | Todos los indicadores y gráficos cambian a esa empresa | [ ] |

## G. Celular y accesibilidad

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| G1 | **F12 → modo dispositivo** (Ctrl+Mayús+M), ancho **360 px**; recorrer todas las pantallas | Menú con botón de hamburguesa, tablas convertidas en tarjetas y **sin barra de desplazamiento horizontal** | [ ] |
| G2 | En 360 px, abrir el menú y elegir una opción | El menú se cierra solo y muestra la pantalla | [ ] |
| G3 | Usar **solo el teclado** (Tab, Mayús+Tab, Enter, Esc) en el login y en el pago | Todo es alcanzable, el foco se ve, la ventana de pago no deja salir el foco y **Esc** la cierra | [ ] |
| G4 | Ampliar el navegador al **200 %** (Ctrl y +) | La pantalla sigue siendo usable y legible | [ ] |
| G5 | En los formularios con errores | Cada error está junto a su campo, con icono y texto (no solo color rojo) | [ ] |

## H. Seguridad básica

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| H1 | En PowerShell: `curl.exe -i http://localhost:8080/api/clientes` | Respuesta **401** (sin sesión no hay datos) | [ ] |
| H2 | Con OPERADOR intentar llamar a `autorizar` o crear empresa (lo comprueba `verificar.ps1`) | **403** | [ ] |
| H3 | (IIS) Abrir `http://localhost:8080/scalar` y `http://localhost:8080/openapi/v1.json` | **No muestran la documentación de la API**: aparece la pantalla de ingreso de la web (ni una página de Scalar ni un JSON). Si aparece la documentación, `ASPNETCORE_ENVIRONMENT` no es `Production` | [ ] |
| H4 | (IIS) Buscar claves en los archivos de la aplicación: `Select-String -Path C:\inetpub\GestionContratos\*.json, C:\inetpub\GestionContratos\web.config -Pattern "Password=","Jwt__Key",([regex]::Escape('"Key"'))` | **Sin resultados**: la cadena de conexión y la clave del token no están en ningún archivo de la aplicación | [ ] |
| H5 | (IIS) Con un usuario normal de Windows (no administrador) intentar abrir `C:\Windows\System32\inetsrv\config\applicationHost.config` | **Acceso denegado** (ahí están las variables de entorno) | [ ] |
| H6 | Comprobar los permisos del usuario SQL: con `gc_app` ejecutar `create table x(id int)` | Error **«CREATE TABLE permission denied»** | [ ] |
| H7 | Mirar la pantalla de login en la instalación de IIS | **No** muestra la clave de demostración (ese aviso solo existe en modo debug) | [ ] |

## I. Resistencia a fallos

| # | Qué hacer | Qué debe pasar | OK |
|---|---|---|---|
| I1 | Con una lista abierta, **detener el servicio de SQL Server** y pulsar una página de otra pantalla | Aparece un cuadro rojo claro con **Reintentar** (no una pantalla en blanco ni un texto técnico) | [ ] |
| I2 | Volver a **iniciar SQL Server** y pulsar **Reintentar** | La lista carga normalmente | [ ] |
| I3 | (IIS) Reciclar el grupo de aplicaciones (`Restart-WebAppPool GestionContratos`) con la sesión abierta | La sesión **sigue** válida (la clave de los tokens no cambia) | [ ] |

## J. Integridad de los datos (al terminar)

Ejecute `scripts\consultas_verificacion.sql` y confirme que **todas las consultas de la sección B devuelven 0 filas**. Revise la sección C: **no deben quedar usuarios de demostración** si la base se usará con información real.

---

## Registro de resultados

| Dato | Valor |
|---|---|
| Fecha | |
| Persona que prueba | |
| Ambiente (debug / IIS) y dirección | |
| Versión (últimos 7 caracteres de `git rev-parse HEAD`) | |
| Resultado de `verificar.ps1` | _ de 12 |

| Prueba | Resultado (OK / FALLA) | Qué se vio y captura de pantalla |
|---|---|---|
| | | |

**Criterio de aceptación sugerido:** el 100 % de las secciones **A, B, C, D, E, H y J**, y las secciones **F, G e I** sin fallos graves (un fallo es *grave* si impide cobrar, autorizar o ver datos correctos).
Si una prueba falla, anote el número, los pasos exactos, lo que esperaba y lo que pasó, y la hora (para buscarla en los registros).
