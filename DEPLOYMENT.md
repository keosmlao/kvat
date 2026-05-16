# SMLAO Production Deployment

ໂນ້ດສຳລັບ deploy SMLAO ໄປ production. ບໍ່ແມ່ນ runbook ສຳເລັດ — ເພີ່ມຕາມຕ້ອງການ.

## 1. Environment variables

ສ້າງ `.env.production` (ບໍ່ commit) — copy `.env` ແລ້ວປ່ຽນຄ່າ:

```ini
# REQUIRED — ບໍ່ໃຫ້ໃຊ້ default
SESSION_SECRET="…"                 # 64+ random chars — `openssl rand -base64 48`
DATABASE_URL="postgresql://…"      # template/legacy DB (kvat)
MASTER_DATABASE_URL="postgresql://…"
TENANT_DB_ADMIN_URL="postgresql://admin:…@host:5432/postgres"
TENANT_DB_HOST="…"
TENANT_DB_USER="…"
TENANT_DB_PASSWORD="…"

# eTax — global defaults; tenant Setting can override per shop
ETAX_GATEWAY_URL="https://etax-gw.mof.gov.la:8443"
ETAX_ENV="prod"
ETAX_USERNAME=""
ETAX_SECRET=""
ETAX_ISSUE_CODE=""

# tenant-prisma cache tuning (optional)
TENANT_PRISMA_MAX="50"
TENANT_PRISMA_IDLE_MS="1800000"   # 30 min

# LoginLog retention (optional, default 90d)
LOGIN_LOG_KEEP_DAYS="90"
```

⚠ `SESSION_SECRET` ໃນ dev ເປັນ placeholder. **ປ່ຽນກ່ອນ prod** — JWT ທີ່ສ້າງດ້ວຍ secret
ນັ້ນ forge ໄດ້ສະບາຍ.

## 2. Postgres roles + isolation

ປະຈຸບັນ `TENANT_DB_USER` ດຽວເຂົ້າຫາທຸກ tenant DB. ສຳລັບ defense-in-depth:

```sql
-- Admin role: CREATEDB privilege, used by provisioning only
CREATE ROLE smlao_admin LOGIN PASSWORD '…' CREATEDB;

-- App role: connects to tenant DBs, NOT able to create new DBs
CREATE ROLE smlao_app LOGIN PASSWORD '…';

-- Per-tenant: grant smlao_app to the specific DB only (run during provisioning)
GRANT ALL PRIVILEGES ON DATABASE "kvat_acme" TO smlao_app;
REVOKE CONNECT ON DATABASE "kvat_acme" FROM PUBLIC;
```

ປະຈຸບັນ provisioning ບໍ່ໄດ້ສ້າງ role per tenant. ຖ້າຕ້ອງການ true isolation:
ດັດແປງ `src/lib/provision.ts` ໃຫ້ CREATE ROLE + GRANT ຫລັງ CREATE DATABASE.

## 3. Backups

```bash
# Daily — dump master + ທຸກ tenant DBs
for db in $(psql -tA -l | grep -E '^(smlao_master|kvat|kvat_)' | cut -d'|' -f1); do
  pg_dump -h "$DB_HOST" -U "$DB_USER" "$db" \
    | gzip > "/backups/$(date -u +%Y%m%d)/$db.sql.gz"
done
```

ໃສ່ໃນ cron daily ໂມງ 03:00. Rotate 30 days.

## 4. Cron jobs

```cron
# Trial expiry — daily 02:00
0 2 * * *  cd /srv/smlao-app && /usr/local/bin/npm run trial:expire

# LoginLog prune — weekly Sunday 03:00
0 3 * * 0  cd /srv/smlao-app && /usr/local/bin/npm run loginlog:prune
```

## 5. Schema updates

ເມື່ອແກ້ `prisma/schema.prisma`:

```bash
npm run dump:tenant-schema       # regenerate tenant-schema.sql template
# ApplY change to ALL existing tenant DBs ດ້ວຍຕົນເອງ:
for db in $(psql -tA -l | grep -E '^kvat' | cut -d'|' -f1); do
  DATABASE_URL="postgresql://…/$db" npx prisma db push --skip-generate
done
```

(ບໍ່ມີ batch migrator ໃນຕອນນີ້ — ຄວນສ້າງ.)

## 6. Reverse proxy + TLS

Caddy ຕົວຢ່າງ:

```caddy
smlao.la {
  reverse_proxy localhost:3000
  encode gzip
}
```

`NODE_EXTRA_CA_CERTS=./certs/etax-ca.pem` ຍັງຕ້ອງມີໃນ env ສຳລັບ eTax TLS chain.

## 7. Monitoring

- App: pm2 ຫຼື systemd ກ່ຽວກັບ restart on crash
- DB: alert on connection pool saturation, slow queries
- /manage tenant detail ສະແດງ LoginLog → ສຳລັບ audit
- Tenant DB count grows linearly with customers — alert if > 80% of TENANT_PRISMA_MAX

## 8. ສິ່ງທີ່ຍັງຂາດ (ບໍ່ໄດ້ build)

- SMTP/email — password reset link ປະຈຸບັນ console.log ໃຫ້ operator
- Batch migrator ສຳລັບ schema changes ຂ້າມ tenant DBs
- Per-tenant Postgres role
- Encryption at rest ສຳລັບ eTax secret ໃນ Setting table
- Redis-backed rate-limit (in-memory ບໍ່ scale ຂ້າມ instance)
- CI/CD pipeline
