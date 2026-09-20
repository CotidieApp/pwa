# Cotidie — checklist de release (Android / armar)

Ubicación: junto al proyecto en `Documents\Cotidie\docs\`. Firmas **no** van en git; viven en variables de usuario.

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
4. `JAVA_HOME` debe apuntar a Temurin 25 (no Oracle 8).

## Compilar / publicar

- Perfil PowerShell: función `armar` (carga `COTIDIE_*` / `NOVUM_*` desde env de usuario; **no** scrapea `build.gradle`).
- Ejemplos: `armar cotidie`, `armar cotidie novum`, etc. (ver ayuda de `armar` si dudas).
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
