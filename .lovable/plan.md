# Arreglar el error "Email no confirmado" al ingresar

## Qué está pasando

Al crear la cuenta, el sistema envía un correo de verificación y no permite entrar hasta que se confirme. Los intentos de ingreso con `juridica@grupoimperio.co` y `trabajadores@grupoimperio.co` fallan por eso ("Email not confirmed"), no por contraseña incorrecta.

## Qué haré

1. Activar la **confirmación automática de correo** en la autenticación del backend, para que las cuentas nuevas queden habilitadas al instante y no dependan de un email.
2. Confirmar las cuentas ya creadas (`juridica@grupoimperio.co`, `trabajadores@grupoimperio.co`) para que puedan entrar de inmediato con la contraseña que ya registraste.
3. Ajustar la pantalla de Ingreso: al crear la cuenta, iniciar sesión automáticamente y mostrar mensajes claros en español (correo ya registrado, contraseña débil, credenciales inválidas).

## Nota

Como es un sistema interno de RRHH para un equipo pequeño, la verificación por correo no aporta seguridad real y solo bloquea el acceso. Si más adelante quieres exigir verificación de correo, se puede reactivar.

## Detalles técnicos

- `supabase--configure_auth` con `auto_confirm_email: true` (mantener `disable_signup: false`, sin usuarios anónimos).
- Actualizar `email_confirmed_at` de los usuarios existentes vía Auth Admin.
- Editar `src/routes/auth.tsx`: tras `signUp` exitoso, llamar `signInWithPassword` y redirigir a `/dashboard`; mapear errores de Supabase a textos en español.
