#!/bin/sh
# Daily PostgreSQL dump, keeps the last 14 days. Example crontab entry:
#   15 3 * * * cd /opt/persodash && ./deploy/backup.sh >> backups/backup.log 2>&1
set -eu
mkdir -p backups
file="backups/persodash-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T db pg_dump -U persodash persodash | gzip > "$file"
find backups -name 'persodash-*.sql.gz' -mtime +14 -delete
echo "backup written: $file"
