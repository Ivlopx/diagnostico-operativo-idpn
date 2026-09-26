#!/bin/sh
set -eu

backup_dir="${BACKUP_DIR:-./backups}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
compose_file="${COMPOSE_FILE:-compose.vps.yml}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${backup_dir}/dopyme-${timestamp}.sql.gz"

mkdir -p "$backup_dir"
docker compose -f "$compose_file" exec -T db pg_dump -U dopyme -d dopyme --clean --if-exists | gzip -9 > "$destination"
gzip -t "$destination"
find "$backup_dir" -type f -name 'dopyme-*.sql.gz' -mtime "+$retention_days" -delete

echo "Backup verified: $destination"
