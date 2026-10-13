/*****************************************************************/
/*  QuitarUsuarioSql.sql - Elimina el usuario creado por         */
/*  CrearUsuarioSql.sql (para limpiar un ambiente de pruebas).   */
/*                                                               */
/*    sqlcmd -S localhost -f 65001 -b -i QuitarUsuarioSql.sql ^  */
/*           -v NombreBD=dbALQUILERES UsuarioApp=gc_app          */
/*****************************************************************/
:on error exit
use [$(NombreBD)]
go
if exists (select 1 from sys.database_principals where name = '$(UsuarioApp)')
	drop user [$(UsuarioApp)]
go
use master
go
if exists (select 1 from sys.server_principals where name = '$(UsuarioApp)')
	drop login [$(UsuarioApp)]
go
print 'Usuario $(UsuarioApp) eliminado.'
go
