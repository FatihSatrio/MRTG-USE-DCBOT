# 📡 MikroTik Discord Monitoring Bot

🚀 Monitor perangkat MikroTik Anda melalui Discord dengan notifikasi real-time untuk **status perangkat**, **log sistem**, **bandwidth**, **CPU usage**, serta **backup otomatis konfigurasi** yang dikirim langsung ke channel Discord.

---

## 📦 Fitur

* 🔍 **Monitoring Status MikroTik**
  * Notifikasi saat perangkat ONLINE / OFFLINE.

* 📝 **MikroTik System Logs**
  * Mengirim log router secara real-time ke channel Discord.

* 📡 **Monitoring Bandwidth**
  * Monitor TX/RX bandwidth dalam Mbps.
  * Alert jika bandwidth melebihi batas yang ditentukan.

* 💻 **CPU Usage Alert**
  * Peringatan jika CPU MikroTik melebihi threshold (default 70%).

* 💾 **Auto Backup Router**
  * Backup otomatis konfigurasi `.rsc` & `.backup`.
  * File dikirim langsung ke channel Discord dengan **attachment di dalam embed**.
  * Jadwal backup dapat diatur dengan cron (`default: setiap jam 12 malam WIB`).

* 🛠️ **Customizable Settings**
  * Konfigurasi monitoring interval, channel Discord, jadwal backup, dan lainnya melalui `.env`.

---

## 🛠️ Instalasi

1. **Clone Repository**

```bash
git clone https://github.com/FatihSatrio/MRTG-USE-DCBOT.git
cd MRTG-USE-DCBOT
```

2. **Install Dependencies**

```bash
npm install discord.js node-routeros basic-ftp node-cron dotenv pm2
```

3. **Konfigurasi Environment**  
   Buat file `.env` sesuai template berikut:

```env
# === Discord Bot ===
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=channel_id_monitoring
DISCORD_LOG_CHANNEL_ID=channel_id_log
DISCORD_SYSTEM_LOG_CHANNEL_ID=channel_id_system_log
DISCORD_BANDWIDTH_CHANNEL_ID=channel_id_bandwidth
DISCORD_BACKUP_CHANNEL_ID=channel_id_backup
DISCORD_MENTION_USER_IDS=comma_separated_discord_user_ids

# === MikroTik Router ===
MIKROTIK_HOST=router_ip
MIKROTIK_USER=router_username
MIKROTIK_PASS=router_password
MIKROTIK_FTP_PORT=21

# === Monitoring Settings ===
MONITOR_INTERFACE=interface_name
MAX_BANDWIDTH_MBPS=100
CPU_THRESHOLD=70

CHECK_INTERVAL=10000              # interval cek status (ms)
LOG_POLL_INTERVAL=15000           # interval polling log (ms)
IDENTITY_REFRESH_INTERVAL=60000   # interval refresh identity (ms)

# === Backup Settings ===
BACKUP_NAME_PREFIX=mikrotik-backup
BACKUP_DIR=./backups
BACKUP_PASSWORD=optional_password_for_.backup

# Cron expression (default setiap jam 12 malam WIB)
BACKUP_CRON=0 0 * * *
BACKUP_CRON_TZ=Asia/Jakarta
```

4. **Jalankan Bot**

```bash
node index.js
```

---

## ⚡ Menjalankan dengan PM2

Agar bot tetap berjalan di background:

```bash
npm install -g pm2
pm2 start index.js --name mikrotik-monitor
```

Pantau log:

```bash
pm2 logs mikrotik-monitor
```

Hentikan bot:

```bash
pm2 stop mikrotik-monitor
```

Restart bot:

```bash
pm2 restart mikrotik-monitor
```

Daftar semua proses PM2:

```bash
pm2 list
```

Auto-start saat server reboot:

```bash
pm2 startup
pm2 save
```

---

## ⚙️ Penggunaan

Bot akan mengirimkan notifikasi ke channel Discord yang sudah diatur:

* ✅ MikroTik **online**
* 🔴 MikroTik **offline**
* 📝 Log baru dari router
* 📡 TX/RX bandwidth tiap interval
* 🚨 Bandwidth melebihi batas
* ⚠️ CPU usage tinggi
* 💾 Backup otomatis (atau manual via command `!backup-now`)  
  File backup `.rsc` & `.backup` akan dikirim **sebagai attachment di embed**.

---

⭐ **Star repo ini jika bermanfaat untukmu!** ⭐
