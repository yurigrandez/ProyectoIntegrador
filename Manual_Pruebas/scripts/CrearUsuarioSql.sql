/*****************************************************************/
/*  CrearUsuarioSql.sql - Usuario de SQL Server para la aplicación */
/*                                                               */
/*  Crea (o actualiza la clave de) un usuario con los permisos   */
/*  MÍNIMOS que necesita la API: leer y escribir datos. No puede */
/*  crear, modificar ni borrar tablas ni bases de datos.         */
/*                                                               */
/*  Requiere modo SQLCMD y tres variables. Ejemplo:              */
/*    sqlcmd -S localhost -f 65001 -b -i CrearUsuarioSql.sql ^   */
/*           -v NombreBD=dbALQUILERES UsuarioApp=gc_app ClaveApp="<clave>" */
/*                                                               */
/*  La clave NO se guarda en este archivo: se pasa al ejecutarlo. */
/*  Use una clave larga (12 o más caracteres) con mayúsculas,    */
/*  minúsculas, números y símbolos, y evite la comilla simple (') */
/*  y el signo $( .                                              */
/*****************************************************************/
:on error exit
use master
go

if not exists (select 1 from sys.server_principals where name = '$(UsuarioApp)')
begin
	print 'creando inicio de sesión $(UsuarioApp)...'
	create login [$(UsuarioApp)] with password = '$(ClaveApp)', default_database = [$(NombreBD)],
		check_policy = on, check_expiration = off
end
else
begin
	print 'el inicio de sesión $(UsuarioApp) ya existe: se actualiza su clave...'
	alter login [$(UsuarioApp)] with password = '$(ClaveApp)'
end
go

use [$(NombreBD)]
go

if not exists (select 1 from sys.database_principals where name = '$(UsuarioApp)')
begin
	print 'creando usuario en la base $(NombreBD)...'
	create user [$(UsuarioApp)] for login [$(UsuarioApp)]
end
go

-- Solo datos: leer y escribir. Sin db_owner, sin db_ddladmin, sin permisos de esquema.
alter role db_datareader add member [$(UsuarioApp)]
alter role db_datawriter add member [$(UsuarioApp)]
go

print 'Listo. Permisos de $(UsuarioApp) en $(NombreBD): lectura y escritura de datos.'
go
