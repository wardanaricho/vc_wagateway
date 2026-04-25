# RawWhap

Backend service untuk manajemen multi-sesi WhatsApp dengan fitur auto-reply, webhook, dan rate limiting berbasis anti-ban. Dibangun dengan Node.js, Express, Prisma ORM, dan library Baileys.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js 5 |
| Database | MySQL / MariaDB |
| ORM | Prisma 7 (adapter MariaDB) |
| WhatsApp | Baileys (WhiskeySockets) |
| Auth | JWT (access 15m / refresh 7d) |
| Password | bcryptjs |
| Testing | Vitest |

---

## Fitur

- **Multi-Session WhatsApp** — kelola banyak nomor WA sekaligus
- **Auto-Reply** — balas pesan otomatis dengan matcher: `exact`, `contains`, `startsWith`, `endsWith`, `regex`
- **Webhook** — notifikasi event pesan ke URL eksternal + HMAC-SHA256 signature
- **API Key** — autentikasi berbasis key untuk integrasi eksternal (`rwp_xxx`)
- **Anti-Ban System** — throttle pesan (delay 1-4 detik, max 60/jam, 300/hari per sesi)
- **Rate Limiting** — global 100 req/15min, auth 10 req/15min, kirim pesan 60 req/min

---

## Prasyarat

- Node.js >= 18
- MySQL / MariaDB
- npm

---

## Instalasi

```bash
# 1. Clone & install dependencies
git clone <repo-url>
cd RawWhap
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env sesuai konfigurasi database dan JWT secret

# 3. Jalankan migrasi database
npx prisma migrate deploy

# 4. (Opsional) Seed database
npx prisma db seed

# 5. Jalankan server
npm run dev       # Development (hot reload)
npm start         # Production
```

---

## Environment Variables

Buat file `.env` dari `.env.example`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/raw_whapp"
DATABASE_HOST="localhost"
DATABASE_USER="root"
DATABASE_PASSWORD=""
DATABASE_NAME="raw_whapp"
DATABASE_PORT=3306

JWT_ACCESS_SECRET="<64-char-hex>"
JWT_REFRESH_SECRET="<64-char-hex>"

PORT=3000
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Scripts

```bash
npm run dev           # Development server
npm start             # Production server
npm test              # Run tests
npm run test:watch    # Test watch mode
npm run test:coverage # Coverage report
npm run make:module   # Scaffold modul baru
```

---

## API Endpoints

### Autentikasi — `/api/auth`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/auth/register` | — | Registrasi user baru |
| POST | `/api/auth/login` | — | Login → `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | — | Refresh access token |
| GET | `/api/auth/me` | JWT | Profil user saat ini |

### WhatsApp Sessions — `/api/sessions`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/sessions` | JWT | List semua sesi |
| POST | `/api/sessions` | JWT | Buat sesi baru |
| GET | `/api/sessions/:id` | JWT | Detail sesi |
| PATCH | `/api/sessions/:id` | JWT | Update sesi |
| DELETE | `/api/sessions/:id` | JWT | Hapus sesi |
| POST | `/api/sessions/:id/connect` | JWT | Hubungkan WA (generate QR) |
| POST | `/api/sessions/:id/disconnect` | JWT | Putus koneksi WA |
| GET | `/api/sessions/:id/qr` | JWT | Ambil QR code saat ini |
| GET | `/api/sessions/:id/status` | JWT | Status koneksi |
| POST | `/api/sessions/:id/send` | JWT / API Key | Kirim pesan |
| GET | `/api/sessions/:id/messages` | JWT | Riwayat pesan |

### API Keys — `/api/keys`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/keys` | JWT | List API key |
| POST | `/api/keys` | JWT | Buat API key baru (tampil sekali) |
| PATCH | `/api/keys/:id/revoke` | JWT | Nonaktifkan key |
| DELETE | `/api/keys/:id` | JWT | Hapus key |

**Format key:** `rwp_<32 hex chars>`  
**Penggunaan:** Header `X-API-Key: rwp_xxx` atau query `?api_key=rwp_xxx`

### Auto-Reply — `/api/auto-replies`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/auto-replies` | JWT | List rules (`?sessionId=xxx`) |
| POST | `/api/auto-replies` | JWT | Buat rule baru |
| GET | `/api/auto-replies/:id` | JWT | Detail rule |
| PATCH | `/api/auto-replies/:id` | JWT | Update rule |
| DELETE | `/api/auto-replies/:id` | JWT | Hapus rule |

**Match types:** `exact` · `contains` · `startsWith` · `endsWith` · `regex`

### Webhooks — `/api/webhooks`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/webhooks` | JWT | List webhooks |
| POST | `/api/webhooks` | JWT | Daftarkan webhook |
| GET | `/api/webhooks/:id` | JWT | Detail webhook |
| PATCH | `/api/webhooks/:id` | JWT | Update webhook |
| DELETE | `/api/webhooks/:id` | JWT | Hapus webhook |

Webhook payload ditandatangani dengan `HMAC-SHA256`. Verifikasi header `X-Hub-Signature-256: sha256=<hex>`.

---

## Autentikasi

### JWT

```
POST /api/auth/login
→ { accessToken, refreshToken, user }

# Gunakan di header:
Authorization: Bearer <accessToken>

# Refresh saat expired (15 menit):
POST /api/auth/refresh
Body: { refreshToken }
```

### API Key

```
POST /api/keys
→ { key: "rwp_xxx" }   ← hanya tampil sekali

# Gunakan di header:
X-API-Key: rwp_xxx

# Atau query param:
GET /api/sessions/:id/send?api_key=rwp_xxx
```

---

## Database Schema

```
users
  ├── id (CUID)
  ├── email (unique)
  ├── username (unique)
  ├── password (bcrypt)
  ├── name
  └── role

wa_sessions
  ├── id, userId (FK)
  ├── name, phone
  ├── status, qr
  └── authKeys → auth_keys

auth_keys          ← credentials sesi Baileys
  ├── sessionId, keyId (unique pair)
  └── data (LONGTEXT)

api_keys
  ├── userId, name
  ├── key (unique, rwp_xxx)
  └── isActive

auto_replies
  ├── userId, sessionId (nullable FK)
  ├── keyword, matchType
  ├── response
  └── isActive

webhooks
  ├── userId, url
  ├── events (comma-separated)
  ├── secret (HMAC key)
  └── isActive

messages
  ├── userId, sessionId
  ├── remoteJid, fromMe
  ├── type, content, status
  └── messageId
```

---

## Anti-Ban Config

| Parameter | Nilai |
|-----------|-------|
| Delay antar pesan | 1 – 4 detik (random) |
| Maks pesan per jam | 60 |
| Maks pesan per hari | 300 |
| Maks burst | 5 pesan |

Pesan diantri secara otomatis melalui sistem queue internal.

---

## Struktur Proyek

```
src/
├── app.ts
├── middleware/
│   └── rate-limiter.ts
├── modules/
│   ├── auth/
│   ├── wa-session/
│   ├── baileys/
│   ├── api-key/
│   ├── auto-reply/
│   ├── webhook/
│   └── anti-ban/
├── types/
│   └── express.d.ts
└── utils/
    └── jwt.ts

prisma/
├── schema.prisma
├── seed.ts
└── migrations/

lib/
└── prisma.ts

generated/
└── prisma/       ← auto-generated types
```

---

## Testing

```bash
npm test                # sekali
npm run test:watch      # watch mode
npm run test:coverage   # dengan coverage
```

Test tersedia di:
- `src/modules/auth/auth.service.test.ts`
- `src/modules/api-key/api-key.service.test.ts`
- `src/modules/auto-reply/auto-reply.service.test.ts`
- `src/modules/auto-reply/auto-reply.matcher.test.ts`
- `src/modules/webhook/webhook.service.test.ts`
- `src/modules/webhook/webhook.signature.test.ts`
- `src/modules/wa-session/wa-session.test.ts`
- `src/utils/jwt.test.ts`

---

## License

MIT
