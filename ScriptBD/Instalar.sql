/*****************************************************************/
/*  Instalar.sql - Crea la BD completa con datos de demostración */
/*                                                               */
/*  Requiere modo SQLCMD y la variable NombreBD. Desde esta      */
/*  carpeta:                                                     */
/*    sqlcmd -S localhost -f 65001 -b -v NombreBD=dbALQUILERES -i Instalar.sql */
/*  Para la BD de pruebas: -v NombreBD=dbALQUILERES_TEST         */
/*  ATENCIÓN: elimina y recrea la BD indicada.                   */
/*****************************************************************/
:on error exit
:r Tablas.sql
:r Datos.sql
:r Vistas.sql
:r DatosDemo.sql
