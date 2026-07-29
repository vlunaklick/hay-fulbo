# Producción

Release certificado el 29 de julio de 2026.

## Aplicación

- URL: <https://mc45f9py9eksmuhrh4ybdhrg.179.197.70.53.sslip.io>
- Commit desplegado: `cf4bab96c7c68dc8ced32bc9ce6c1ff20784968f`
- Deployment: `y8smnn50efjayejfhxpm4vg3`
- Estado final: `finished`, `running:healthy`
- Proyecto Coolify: `rinqjpkz13y55gz5wh50meis`
- Ambiente Coolify: `cjx199hbh67yn3yjq84nxkbq`
- Aplicación Coolify: `mc45f9py9eksmuhrh4ybdhrg`

La imagen ejecuta las migraciones antes de iniciar Next.js. El release pasó build,
tipos, lint, pruebas unitarias, integración PostgreSQL, E2E desktop/móvil, axe,
build Docker y el healthcheck interno del contenedor.

## Verificación externa

- Tres consultas consecutivas a `/api/health` respondieron `200`, `status: ok` y
  `Cache-Control: no-store` por HTTPS.
- La pantalla de acceso cargó sin errores de consola ni red en viewports de
  `1280x800` y `390x844`.
- Coolify confirmó que el SHA configurado y el desplegado coinciden.

## Base de datos y backup

- PostgreSQL Coolify: `a29flnruc75l8remaa0v1bzd`
- Red: privada, sin exposición pública
- Backup: `tbou9uggmg4umzu7096x0e3f`
- Frecuencia: diaria
- Retención local: 7 copias
- S3: desactivado
- Ejecución certificada: `k14n5kurboz9a5qhfawqgg85`, estado `success`

## Rollback

Este es el primer release saludable del proyecto. Para recuperar la aplicación,
volver a desplegar el commit certificado desde la aplicación `hay-fulbo-web`. Para
recuperar datos, restaurar la última ejecución local exitosa desde el backup de
PostgreSQL.

Este documento contiene identificadores operativos y evidencia, pero no secretos,
tokens, contraseñas ni valores de variables de entorno.
