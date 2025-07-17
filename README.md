```📡 MikroTik Discord Monitor Bot
Monitor perangkat MikroTik RouterOS secara real-time melalui Discord Bot dengan fitur:

✅ Status UP/DOWN MikroTik

📊 Monitoring Bandwidth TX / RX

📝 Realtime MikroTik Logs

🔔 Tag @everyone saat Router DOWN/UP
```
```
📡 MikroTik Discord Monitor Bot
Monitor perangkat MikroTik RouterOS secara real-time melalui Discord Bot dengan fitur:

✅ Status UP/DOWN MikroTik

📊 Monitoring Bandwidth TX / RX

📝 Realtime MikroTik Logs

🔔 Tag @everyone saat Router DOWN/UP
```
```
🚀 Cara Install
1. Clone Project
bash
Copy
Edit
git clone https://github.com/username/mikrotik-discord-monitor.git
cd mikrotik-discord-monitor
2. Install Dependency
bash
Copy
Edit
npm install
3. Konfigurasi .env
Buat file .env di root project:

env
Copy
Edit
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
🎯 Tips: Untuk ID channel Discord, klik kanan channel → Copy ID (Developer Mode harus aktif).
```
