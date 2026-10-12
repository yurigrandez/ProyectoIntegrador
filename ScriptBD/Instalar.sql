/*****************************************************************/
/*  Instalar.sql - Crea la BD completa con datos de demostración */
/*                                                               */
/*  Requiere modo SQLCMD. Ejecutar desde esta carpeta:           */
/*    sqlcmd -S localhost -f 65001 -b -i Instalar.sql            */
/*  (en SSMS: Query > SQLCMD Mode, con la carpeta como actual)   */
/*  ATENCIÓN: elimina y recrea la BD dbALQUILERES.               */
/*****************************************************************/
:on error exit
:r Tablas.sql
:r Datos.sql
:r Vistas.sql
:r DatosDemo.sql
