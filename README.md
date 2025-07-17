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
npm start
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
* 🔐 Batasi akses channel Discord hanya untuk admin atau role tertentu.

---

## 🗈️ Contoh Output

| Status       | Preview                                                        |
| ------------ | -------------------------------------------------------------- |
| ✅ UP / 🔴 DOWN | ![UP/DOWN Example]([https://i.imgur.com/UpExample.png](https://cdn.discordapp.com/attachments/1250790910556635169/1395438571069898762/image.png?ex=687a72f1&is=68792171&hm=5d82b0a1f6320d478b0a438f8def98e959c3a847624d0cd7c17017b1cd6db6bb&))               |
| 📱 Bandwidth | ![Bandwidth Example]([https://i.imgur.com/BandwidthExample.png](https://cdn.discordapp.com/attachments/1250790910556635169/1395438850083655761/image.png?ex=687a7333&is=687921b3&hm=f80cc4f669ebdd200520a0793892c0c20401cc2b4ba6f82a02b1bf21efe1e2f8&)) |
| 📜 Logs      | ![Logs Example]([https://i.imgur.com/LogsExample.png](https://cdn.discordapp.com/attachments/1250790910556635169/1395438969185108026/image.png?ex=687a7350&is=687921d0&hm=3a095f6de987f3cc7ca22e39a642eb989917d1a2f7e074c6a8b6595b5d0e2dc2&))           |

---

## 📞 Kontak & Support

* 📧 Email: [fatih.satrio.as@gmail.com](mailto:fatih.satrio.as@gmail.com)
* 💬 Discord: notmoonn
