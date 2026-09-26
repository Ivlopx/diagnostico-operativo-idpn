# Despliegue recomendado en VPS

La aplicación se empaqueta como una imagen Docker reproducible. `compose.vps.yml`
añade Caddy como proxy inverso y obtiene/renueva automáticamente el certificado
HTTPS del subdominio.

## Preparación

1. Crear un registro DNS `A`/`AAAA` para el subdominio apuntando a la VPS.
2. Instalar Docker Engine y Docker Compose.
3. Habilitar los puertos 80 y 443.
4. Elegir una contraseña aleatoria para PostgreSQL. La contraseña administrativa se crea en la primera visita al panel.

En la VPS, crear un `.env` no versionado:

```dotenv
APP_DOMAIN=dopyme.example.com
POSTGRES_PASSWORD=otra-clave-larga-y-unica
```

Después se podrá construir y arrancar con:

```sh
docker compose -f compose.vps.yml up -d --build
```

Al abrir el panel por primera vez, la aplicación solicita crear la contraseña administrativa y la almacena derivada con sal en PostgreSQL. El panel usa una sesión HTTP-only separada. PostgreSQL no publica
su puerto fuera de la red interna de Compose.

## Respaldo de PostgreSQL

El script incluido genera un volcado comprimido, verifica el archivo y elimina
copias locales con más de 14 días:

```sh
./scripts/backup-postgres.sh
```

Se puede cambiar la carpeta y retención con `BACKUP_DIR` y
`BACKUP_RETENTION_DAYS`. En producción conviene programarlo diariamente y copiar
los archivos a almacenamiento externo cifrado. También se debe monitorizar el
espacio disponible y probar periódicamente la restauración en una base separada.
