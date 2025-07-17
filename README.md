# 📡 MikroTik Discord Monitor Bot

Monitor perangkat **MikroTik RouterOS** secara **real-time** melalui **Discord Bot** dengan fitur:

* ✅ Status **UP/DOWN MikroTik**
* 📊 Monitoring **Bandwidth TX / RX**
* 📝 Realtime **MikroTik Logs**
* 🔔 **Tag @everyone** saat Router **DOWN/UP**

---

## 🛠️ Fitur

| Fitur                 | Deskripsi                                                |
| --------------------- | -------------------------------------------------------- |
| 🔄 Status UP/DOWN     | Monitoring otomatis & alert jika status berubah          |
| 📡 Bandwidth Monitor  | TX (Upload) & RX (Download) tiap interface               |
| 📜 Log Monitoring     | Menampilkan logs terbaru dari MikroTik                   |
| 📣 Notifikasi Discord | Alert via Discord dengan format **Embed** yang aesthetic |
| 🕒 Timestamp Lokal    | Semua waktu dicatat dengan zona **Asia/Jakarta**         |

---

## 🚀 Panduan Setup Lengkap

### 1️⃣ Inisialisasi Project Node.js

```bash
mkdir mikrotik-discord-monitor
cd mikrotik-discord-monitor
npm init -y
```

---

### 2️⃣ Install Dependency

```bash
npm install discord.js node-routeros dotenv pm2
```

---

### 3️⃣ Buat Struktur File

```
/mikrotik-discord-monitor
│   index.js
│   .env
│   package.json
```

---

### 4️⃣ Buat Bot Discord

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **New Application** → Beri nama bot.
3. Masuk ke **Bot** → **Add Bot** → Yes!
4. Salin **Token Bot**.
5. Masuk ke tab **OAuth2 → URL Generator**:

   * Scopes: `bot`, `applications.commands`
   * Bot Permissions: `Administartor`
6. Copy link OAuth, buka di browser, dan invite bot ke servermu.

---

### 5️⃣ Konfigurasi `.env`

Buat file `.env` di root project:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=channel_id_monitoring
DISCORD_LOG_CHANNEL_ID=channel_id_logs
DISCORD_BANDWIDTH_CHANNEL_ID=channel_id_bandwidth

MIKROTIK_HOST=IP_AKSES_MIKROTIK
MIKROTIK_USER=admin
MIKROTIK_PASS=yourpassword
MONITOR_INTERFACE=ether1

CHECK_INTERVAL=10000          # Interval cek status UP/DOWN (ms)
LOG_POLL_INTERVAL=30000       # Interval polling log (ms)
```

> 🎯 **Tips:** Untuk ID channel Discord, klik kanan channel → **Copy ID** (Developer Mode harus aktif).

---

### 6️⃣ Tulis Code pada `index.js`

Tulis kode utama untuk monitoring MikroTik, bandwidth, logs, dan notifikasi Discord.

---

### 7️⃣ Jalankan Bot

#### Mode Development:

```bash
node index.js
```

#### Jalankan di Background dengan PM2:

```bash
pm install -g pm2
pm2 start index.js --name mikrotik-bot
pm2 save
pm2 startup
```

**Command tambahan:**

```bash
pm2 logs mikrotik-bot
pm2 restart mikrotik-bot
pm2 stop mikrotik-bot
```

---

## 🎨 Customisasi & Personalisasi

* ✏️ **Pesan Embed:** Edit teks, emoji, warna pada `index.js`.
* 🕒 **Interval Waktu:** Ubah di `.env` → `CHECK_INTERVAL` & `LOG_POLL_INTERVAL`.
* 🌏 **Zona Waktu:** Default `Asia/Jakarta`. Ubah fungsi waktu lokal jika perlu.

---

## 🛡️ Keamanan

* 🔒 Gunakan akun MikroTik khusus untuk monitoring dengan akses terbatas.
* 🔐 Batasi akses channel Discord hanya untuk admin atau role tertentu.

---

## 📞 Kontak & Support

* 💬 Discord: notmoonn
