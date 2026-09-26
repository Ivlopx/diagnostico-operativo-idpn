# DIAGNÓSTICO OPERATIVO

Aplicación para el Diagnóstico Operativo de Pequeñas y Medianas Empresas (DOPYME) y la identificación y documentación de Procesos Sujetos a Mejora Inmediata (PSMI).

Cada expediente se protege con un enlace privado. El backend intercambia su token
por una sesión HTTP-only; no existen cuentas individuales para invitados y no se
permite buscar empresas por nombre. Los datos viven en PostgreSQL.

## Run Locally

**Requisitos:** Node.js 24 y PostgreSQL 17, o Docker Compose.


1. Install dependencies:
   `npm install`
2. Define `DATABASE_URL`. La contraseña administrativa se crea desde el asistente inicial de la aplicación.
3. Ejecuta `npm run build && npm start`, o usa `docker compose -f compose.local.yml up --build`.

Al crear una empresa se genera un enlace con el formato
`/w/<workspaceId>#invite=<token>`. El fragmento contiene la credencial y debe
conservarse y compartirse de forma privada. El propietario original puede
regenerarlo desde la cabecera; esto invalida las sesiones invitadas anteriores.

## Expedientes anteriores

Los expedientes históricos de Firestore no se leen en tiempo de ejecución. Para
conservarlos hará falta una importación administrativa puntual que cree registros
SQL y nuevas invitaciones; Firebase no forma parte de la solución final.

Consulta [DEPLOYMENT.md](DEPLOYMENT.md) para la propuesta Docker + Caddy en VPS.
