# 📡 MikroTik Discord Monitoring Bot

🚀 Monitor perangkat MikroTik Anda melalui Discord dengan notifikasi real-time untuk status perangkat, log sistem, bandwidth, dan penggunaan CPU.

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

* 🛠️ **Customizable Settings**

  * Konfigurasi monitoring interval & channel Discord melalui `.env`.

---

## 🛠️ Instalasi

1. **Clone Repository**

```bash
git clone https://github.com/FatihSatrio/MRTG-USE-DCBOT.git
cd MRTG-USE-DCBOT
```

2. **Install Dependencies**

```bash
npm install discord.js node-routeros dotenv pm2
```

3. **Konfigurasi Environment**
   Buat file `.env` sesuai template berikut:

```
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=channel_id_monitoring
DISCORD_LOG_CHANNEL_ID=channel_id_log
DISCORD_SYSTEM_LOG_CHANNEL_ID=channel_id_system_log
DISCORD_BANDWIDTH_CHANNEL_ID=channel_id_bandwidth
DISCORD_MENTION_USER_IDS=comma_separated_discord_user_ids

MIKROTIK_HOST=router_ip
MIKROTIK_USER=router_username
MIKROTIK_PASS=router_password

MONITOR_INTERFACE=interface_name
MAX_BANDWIDTH_MBPS=100

CHECK_INTERVAL=10000 # dalam milidetik (10 detik)
LOG_POLL_INTERVAL=15000
IDENTITY_REFRESH_INTERVAL=60000
```

4. **Jalankan Bot**

```bash
node index.js
```

---

## ⚙️ Penggunaan

* Bot akan mengirimkan:

  * ✅ Notifikasi saat MikroTik online.
  * 🔴 Notifikasi saat MikroTik offline.
  * 📝 Log baru pada router.
  * 📡 Monitoring TX/RX bandwidth.
  * 🚨 Peringatan jika bandwidth penuh.
  * ⚠️ Peringatan jika CPU melebihi batas threshold.

---

⭐ **Star repo ini jika bermanfaat untukmu!** ⭐
