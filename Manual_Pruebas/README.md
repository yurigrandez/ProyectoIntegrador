# Manual de pruebas

Guía paso a paso para probar la aplicación de **gestión de contratos de alquiler** de dos maneras:

| Quiero… | Guía | Tiempo aprox. |
|---|---|---|
| Probar en mi computadora mientras se desarrolla (**modo debug**) | [01_Modo_Debug.md](01_Modo_Debug.md) | 20 minutos |
| Instalarla en un servidor **IIS** con usuario y clave de SQL Server | [02_Instalacion_IIS.md](02_Instalacion_IIS.md) | 45 minutos |
| Revisar que todo funciona, pantalla por pantalla | [03_Lista_de_Pruebas.md](03_Lista_de_Pruebas.md) | 40 minutos |

> **Orden recomendado:** primero el modo debug (para conocer la aplicación), luego IIS, y al final la lista de pruebas sobre la instalación que prefiera.

## Cómo funciona (en 30 segundos)

```
  Navegador  ───►  [ Web (Angular) ]  ───►  [ API (.NET) ]  ───►  [ SQL Server ]
                    pantallas               reglas y seguridad     datos
```

- **Modo debug:** la web y la API corren como dos programas separados en su computadora (puertos 4200 y 5099). Los secretos se guardan en *user-secrets*.
- **Modo IIS:** la API publicada **también sirve la web** (un solo sitio, un solo puerto). Los secretos se guardan como **variables de entorno** del grupo de aplicaciones de IIS.
- En ningún caso hay contraseñas dentro del código, de `appsettings.json` ni de `web.config`.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `01_Modo_Debug.md` | Probar en su computadora |
| `02_Instalacion_IIS.md` | Instalar en IIS, con variables de entorno y usuario SQL |
| `03_Lista_de_Pruebas.md` | Lista de pruebas manuales con el resultado esperado de cada una |
| `scripts/CrearUsuarioSql.sql` | Crea el usuario de SQL Server de la aplicación (solo lectura y escritura de datos) |
| `scripts/QuitarUsuarioSql.sql` | Elimina ese usuario (limpieza) |
| `scripts/probar-conexion.ps1` | Comprueba que el usuario y la clave de SQL Server funcionan |
| `scripts/publicar.ps1` | Compila la web y la API y las deja juntas en una carpeta |
| `scripts/configurar-iis.ps1` | Crea el sitio en IIS y guarda las variables de entorno |
| `scripts/verificar.ps1` | Prueba rápida automática (12 comprobaciones en 10 segundos) |

## Usuarios de demostración

La base de datos de demostración trae dos usuarios: **ADMIN** (administrador: autoriza contratos, anula pagos, administra locales y empresas) y **OPERADOR** (registra clientes, contratos y pagos).
La clave está en el [README principal](../README.md). **Solo para pruebas: antes de usar la base de datos con información real hay que eliminar o cambiar esos usuarios.**

## Reglas de oro

1. **Nunca** escriba una clave en un archivo del proyecto, en un mensaje de chat ni en un correo. Los scripts la piden por teclado y no la muestran.
2. Pruebe siempre con una base de datos **de prueba** (`dbALQUILERES_TEST` o `dbALQUILERES`), nunca con la de datos reales.
3. El script que instala la base de datos **borra y vuelve a crear** la base indicada. Revise el nombre antes de ejecutarlo.
4. Si algo falla, vaya a la sección **Problemas frecuentes** de la guía que está usando.
