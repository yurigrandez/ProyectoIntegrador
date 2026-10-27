# Lineamientos del proyecto

## Flujo de trabajo y commits

### Ramas
- Cada cambio se realiza en una **rama nueva** (p. ej. `feature/...`, `fix/...`), creada antes de modificar código. `main` se mantiene estable.

### Commits y push
- **Pregunta siempre al usuario antes de hacer un commit o un push**, aunque haya autorizado uno anterior.

### Datos sensibles
- Verifica que no se suban datos sensibles: claves, tokens, contraseñas, cadenas de conexión reales, direcciones IP, user-secrets, certificados, etc.
- Revisa `git status` y `git diff --staged` antes de proponer el commit, y confirma que el `.gitignore` excluye los archivos de secretos.
- Si detectas un dato sensible, no lo incluyas en el commit; avisa al usuario y propón moverlo a User Secrets o variables de entorno.

### Pruebas
- Cada cambio debe incluir **sus propias pruebas** (unitarias o de integración según corresponda).
- Antes de proponer el commit, ejecuta las pruebas de **toda la aplicación** (backend y frontend) para verificar que el cambio no afecta lo ya desarrollado.
- Informa con fidelidad el resultado; si algo falla, muéstralo y corrígelo antes de continuar.

### Análisis de seguridad
- Antes de realizar un commit, ejecuta `/security-review` sobre los cambios pendientes y reporta los hallazgos al usuario. Atiende los hallazgos relevantes antes de confirmar el commit.
