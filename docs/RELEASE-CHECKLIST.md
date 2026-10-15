# Cotidie — checklist de release (Android / armar)

Ubicación: junto al proyecto en `Documents\Cotidie\docs\`. Firmas **no** van en git; viven en variables de usuario.

El keystore es un archivo privado externo al repositorio; las variables solo contienen su ruta, alias y contraseñas. En este equipo se conserva en `C:\Users\balca\.codex\projects\cotidie\signing\my-release-key.keystore`. Mantener una copia privada independiente para recuperación: los ZIP de código excluyen keystores y archivos `.env*`. Los ZIP/historial Git anteriores pueden conservar copias antiguas; retirarlas del checkout no las elimina de esos lugares ni rota la clave.

## Antes de compilar

1. Abrir una **terminal nueva** (para pillar env actualizado).
2. Verificar env (sin imprimir secretos):

```powershell
@('COTIDIE_KEYSTORE_PATH','COTIDIE_KEYSTORE_PASSWORD','COTIDIE_KEY_ALIAS','COTIDIE_KEY_PASSWORD') | ForEach-Object {
  $v = [Environment]::GetEnvironmentVariable($_,'User')
  if ([string]::IsNullOrWhiteSpace($v)) { "MISSING $_" } else { "OK $_" }
}
```

3. Para Novum (si aplica), lo mismo con `NOVUM_*`.
4. El generador selecciona JDK 21 compatible (por ejemplo Temurin 21). No usar JDK25/Oracle8 para esta configuración.

## Compilar / publicar

- `npm run android:apk` compila localmente bajo el coordinador, conserva la versión y entrega en `dist/`; conserva APK anteriores. No publica ni crea commits.
- `--bump`/`--set X.Y.Z`, `--copy-drive` y `--publish` son opciones independientes del generador. `--publish` crea automáticamente un commit con todos los cambios pendientes, hace push y publica el APK en GitHub Releases. Revisar el árbol antes de usarlo; no ejecutar publicación como validación.

- Perfil PowerShell: función `armar` (carga `COTIDIE_*` / `NOVUM_*` desde env de usuario; **no** scrapea `build.gradle`).
- `armar cotidie` incrementa la versión de parche, compila, copia el APK a la ubicación secundaria, crea un commit con los cambios pendientes, hace push y publica el APK en GitHub Releases.
- `armar cotidie fijo` hace lo mismo sin incrementar la versión; `armar cotidie local` incrementa y compila sin copia secundaria ni publicación. `armar cotidie X.Y.Z` fija una versión concreta y usa el flujo completo.
- `armar cotidie novum` usa el flujo independiente de Novum.
- Si falla signing: faltan env o keystore path inválido — no re-pegar passwords en gradle.

## Git (autoría)

- Repos Cotidie: identidad local `CotidieApp` / `cotidieapp@gmail.com`.
- Fuera de Cotidie: global personal `balcaldegm@gmail.com`.
- Cambiar `user.name`/`user.email` **no** cambia credenciales de push.

## No versionar

- `.env*` (gitignore)
- `*.jks` / `*.keystore` (descomentados en `android/.gitignore`)
- Backups locales `*.bak-before-secrets-move` — no subirlos

## Si algo se rompe

- Backups gradle/perfil: buscar `*.bak-before-secrets-move` / `*.bak-before-cotidie-secrets` junto al archivo original.
- AHK / máquina: `C:\Users\balca\Tools\System\README.md`
