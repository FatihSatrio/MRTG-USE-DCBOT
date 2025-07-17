# 📱 MikroTik Discord Monitor Bot

Monitor perangkat **MikroTik RouterOS** secara **real-time** melalui **Discord Bot** dengan fitur:

* ✅ Status **UP/DOWN MikroTik**
* 📊 Monitoring **Bandwidth TX / RX**
* 📜 Realtime **MikroTik Logs**
* 🔔 **Tag @everyone** saat Router **DOWN/UP**

---

## 🛠️ Fitur

| Fitur                 | Deskripsi                                                |
| --------------------- | -------------------------------------------------------- |
| 🔄 Status UP/DOWN     | Monitoring otomatis & alert jika status berubah          |
| 📱 Bandwidth Monitor  | TX (Upload) & RX (Download) tiap interface               |
| 📜 Log Monitoring     | Menampilkan logs terbaru dari MikroTik                   |
| 🔣 Notifikasi Discord | Alert via Discord dengan format **Embed** yang aesthetic |
| 🕒 Timestamp Lokal    | Semua waktu dicatat dengan zona **Asia/Jakarta**         |

---

## 🚀 Cara Install

### 1️⃣ Clone Project

```bash
git clone https://github.com/username/mikrotik-discord-monitor.git
cd mikrotik-discord-monitor
```

---

### 2️⃣ Install Dependency

```bash
npm install
```

---

### 3️⃣ Konfigurasi `.env`

Buat file `.env` di root project:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=channel_id_monitoring
DISCORD_LOG_CHANNEL_ID=channel_id_logs
DISCORD_BANDWIDTH_CHANNEL_ID=channel_id_bandwidth

MIKROTIK_HOST=192.168.88.1
MIKROTIK_USER=admin
MIKROTIK_PASS=yourpassword
MONITOR_INTERFACE=ether1

CHECK_INTERVAL=10000          # Interval cek status UP/DOWN (ms)
LOG_POLL_INTERVAL=30000       # Interval polling log (ms)
```

> 🌟 **Tips:** Untuk ID channel Discord, klik kanan channel → **Copy ID** (Developer Mode harus aktif).

---

## ▶️ Menjalankan Bot

### 🔹 Mode Development

```bash
node index.js
```

---

### 🔹 Jalankan di Background dengan PM2

```bash
npm install -g pm2
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
* 🚫 Jangan commit file `.env` ke repo publik.
* 🔐 Batasi akses channel Discord hanya untuk admin atau role tertentu.

---

## 🗈️ Contoh Output

| Status       | Preview                                                        |
| ------------ | -------------------------------------------------------------- |
| ✅ UP         | ![UP Example](https://i.imgur.com/UpExample.png)               |
| 🔴 DOWN      | ![DOWN Example](https://i.imgur.com/DownExample.png)           |
| 📱 Bandwidth | ![Bandwidth Example](https://i.imgur.com/BandwidthExample.png) |
| 📜 Logs      | ![Logs Example](https://i.imgur.com/LogsExample.png)           |

---

## 🤝 Contribute

1. Fork repository ini.
2. Buat branch baru: `git checkout -b feature-xyz`.
3. Commit perubahanmu.
4. Push & buat Pull Request.

---

## 📞 Kontak & Support

* 📧 Email: [your.email@example.com](mailto:your.email@example.com)
* 💬 Discord: yourdiscord#1234

---

## 📜 License

Distributed under the **MIT License**. See the [LICENSE](LICENSE) file for more info.
