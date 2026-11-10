# Seguridad opcional de Cartas y respaldos cifrados

## Uso

La opción **Proteger Cartas** está en Información sobre Cartas, junto al recordatorio de 30 días. Al activarla se crea una clave propia: mínimo 8 caracteres o un PIN de al menos 8 cifras. Se recomienda una frase larga. Se repite la clave y se exige reconocer que se ha anotado y que no es recuperable.

En Android 11 o posterior, si existe seguridad compatible configurada, se autoriza también el desbloqueo con biometría fuerte o la credencial del teléfono. En web y Android anteriores se utiliza la clave propia. Android verifica su credencial sin entregársela a Cotidie.

Cartas se bloquea al ocultar o abandonar la app y permite bloquear manualmente. Las rutas de lectura, edición y creación quedan cubiertas, también al restaurar una ruta anterior. En Android se usa FLAG_SECURE en Cartas y en los diálogos de clave.

Al exportar datos completos o solo ajustes:

- Con seguridad desactivada se conserva el respaldo anterior, sin pedir clave.
- Con seguridad activa se pide una autenticación nueva y se cifra el archivo con la clave de Cartas. La extensión sigue siendo `.ctd`.
- Cancelar no genera un archivo. Si la app se bloquea antes de terminar la preparación, la autorización queda invalidada.

Al importar una copia cifrada se pide su clave original, que puede diferir de la clave local actual. Una clave incorrecta o una cancelación no aplica el contenido. Si Cartas ya está protegida localmente, esa protección se conserva; si se restaura en una instalación sin protección, se configura con la clave del respaldo. Las copias antiguas `.ctd` JSON, CTD2 y `.ctdb` siguen admitidas. Las versiones antiguas de Cotidie no entienden CTD3.

La app no ofrece recuperación de la clave. La huella del teléfono no abre un respaldo en otro dispositivo. Desactivar y volver a activar la protección no cambia las claves de los respaldos que ya existen.

## Almacenamiento y autenticación

`letters-security.ts` conserva una clave AES de datos aleatoria de 256 bits, envuelta mediante la clave del usuario. Las cartas se cifran con AES-GCM e IV aleatorio de 12 bytes y AAD `cotidie:letters:v1`. La envoltura usa un propósito autenticado distinto del respaldo. Las claves abiertas solo permanecen en memoria mientras Cartas está desbloqueada.

El estado persistido de SettingsContext contiene `userLetters: []` y una bóveda cifrada. No se hidratan títulos ni textos al estar bloqueada. La protección se integra con el almacenamiento privado ya existente. El presupuesto de intentos y la espera creciente se conservan en esa bóveda: a partir de cinco errores, de 30 segundos hasta 15 minutos.

`LettersSecurityPlugin` guarda la clave propia bajo AES-GCM con una clave de Android Keystore que exige autenticación por cada uso. El `CryptoObject` autenticado debe ser el de esa operación. El sobre nativo reside en `noBackupFilesDir`. Cancelar, salir o invalidar la clave del dispositivo conserva la bóveda y permite utilizar la clave propia. No se utiliza una respuesta booleana como sustituto del control criptográfico.

Los guardados se serializan y comprueban una época de autorización. Las transacciones de activación, desactivación e importación exigen una escritura confirmada. El bloqueo durante una restauración no elimina su marcador de recuperación. Un fallo posterior de limpieza nativa al desactivar no revierte el contenido ya guardado ni deja las cartas vacías.

## Formato CTD3

Se cifra íntegramente el CTD2 o el JSON de ajustes existente. No se añade ZIP: su variante AES convencional deriva claves con PBKDF2-HMAC-SHA1 de 1.000 iteraciones. CTD3 usa Web Crypto con PBKDF2-SHA256 de 600.000 iteraciones y AES-256-GCM.

La cabecera autenticada tiene 48 bytes: firma CTD3, versión y algoritmos, propósito, iteraciones fijas, longitud, sal aleatoria de 16 bytes, IV aleatorio de 12 bytes y bytes reservados. Se añade el texto cifrado con etiqueta de 16 bytes. El límite es 128 MiB de contenido más 64 bytes de envoltura. Los parámetros no admitidos se rechazan antes de derivar claves o leer el cuerpo completo. La clave incorrecta y las alteraciones producen el mismo error de apertura.

Las importaciones externas de Android se leen por bloques en el servicio aislado existente. Los CTD2/CTD3 se preparan en caché privada; el puente solo entrega un token nativo de un archivo, nunca acepta rutas del llamador ni transfiere el archivo entero como base64. Los temporales se retiran al terminar, cancelar, sustituir la importación o destruir la actividad. El consentimiento permanece vinculado a los datos capturados.

## Verificación y alcance

Validación del 10 de noviembre de 2026: 122 pruebas Node, 13 JUnit, compilación Java Android, tipos, build web y 118 entradas PWA correctos. Lint focalizado sin errores ni advertencias. En Edge móvil se comprobó activación, aviso y reconocimiento de clave no recuperable, errores de clave, bloqueo, exportación cifrada, cancelación y restauración en una sesión nueva con protección y contenido conservados.

Pendientes: prueba física de huella, credencial del teléfono, bloqueo y retorno, invalidación de credenciales y apertura externa en WebView Android. No se generó ni instaló APK en esta intervención. La protección no constituye una certificación frente a un sistema operativo o al origen web comprometidos; una clave numérica sigue teniendo menor resistencia a intentos sobre una copia que una frase larga.

## Fuentes

- [Android: autenticación biométrica y credencial del dispositivo](https://developer.android.com/identity/sign-in/biometric-auth).
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore).
- [Web Crypto: AES-GCM](https://www.w3.org/TR/webcrypto-1/#aes-gcm).
- [OWASP: derivación de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2).
- [Formato AES de WinZip](https://www.winzip.com/en/support/aes-encryption/).
