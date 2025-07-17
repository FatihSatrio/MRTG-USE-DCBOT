require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { RouterOSAPI } = require('node-routeros');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let mikrotikConnection;
let mikrotikStatus = 'unknown';
let monitoringChannel, logChannel, bandwidthChannel;
let lastLogId = null;

async function connectMikrotik() {
  if (mikrotikConnection) await mikrotikConnection.close().catch(() => {});

  mikrotikConnection = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASS
  });

  mikrotikConnection.on('error', async (err) => {
    console.error('MikroTik connection error:', err);
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(connectMikrotik, 5000);
  });

  try {
    await mikrotikConnection.connect();
    console.log('✅ Connected to MikroTik!');
  } catch (err) {
    console.error('Failed to connect to MikroTik:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectMikrotik, 5000);
  }
}

async function monitorMikrotik() {
  if (!mikrotikConnection.connected) {
    if (mikrotikStatus !== 'down') {
      mikrotikStatus = 'down';
    }
    sendMikrotikDownAlert();
    return;
  }

  try {
    const resource = await mikrotikConnection.write('/system/resource/print');
    const info = resource[0];

    if (mikrotikStatus !== 'up') {
      mikrotikStatus = 'up';
      sendMikrotikUpAlert(info);
    }

    await monitorBandwidth();
  } catch (err) {
    console.error('monitorMikrotik error:', err);
    if (mikrotikStatus !== 'down') {
      mikrotikStatus = 'down';
    }
    sendMikrotikDownAlert();
  }
}

function sendMikrotikUpAlert(info) {
  const embed = new EmbedBuilder()
    .setTitle('🟢 MikroTik is BACK ONLINE')
    .setDescription('Perangkat MikroTik telah kembali **ONLINE** dan dapat diakses seperti biasa.')
    .addFields(
      { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false },
      { name: '🕒 Uptime', value: info.uptime, inline: true },
      { name: '💻 CPU Load', value: `${info['cpu-load']}%`, inline: true },
      { name: '🧠 Free Memory', value: formatMemory(info['free-memory']), inline: true }
    )
    .setColor('Green')
    .setFooter({ text: 'Status diperbarui otomatis oleh Monitoring Bot' })
    .setTimestamp();

  monitoringChannel.send({
    content: '@everyone ✅ **MikroTik Telah Kembali Online!**',
    embeds: [embed]
  });
}

function sendMikrotikDownAlert() {
  const embed = new EmbedBuilder()
    .setTitle('🔴 MikroTik is OFFLINE')
    .setDescription('🚨 **ALERT!**\nPerangkat MikroTik **TIDAK DAPAT DIAKSES**. Mohon segera cek koneksi atau perangkat fisik.\n\n❗ **Segera lakukan pemeriksaan!**')
    .addFields(
      { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false }
    )
    .setColor('Red')
    .setFooter({ text: 'Status diperbarui otomatis oleh Monitoring Bot' })
    .setTimestamp();

  monitoringChannel.send({
    content: '@everyone 🚨 **MikroTik Saat Ini OFFLINE!**',
    embeds: [embed]
  });
}

async function monitorBandwidth() {
  if (!mikrotikConnection.connected) return;

  try {
    const interfaceName = process.env.MONITOR_INTERFACE;
    const traffic = await mikrotikConnection.write('/interface/monitor-traffic', [
      `=interface=${interfaceName}`,
      '=once='
    ]);

    if (traffic.length > 0) {
      const iface = traffic[0];
      const currentTx = parseInt(iface['tx-bits-per-second']);
      const currentRx = parseInt(iface['rx-bits-per-second']);

      const embed = new EmbedBuilder()
        .setTitle(`📡 Bandwidth Monitor: ${interfaceName}`)
        .addFields(
          { name: '📤 TX (Upload)', value: `${formatBits(currentTx)}/s`, inline: true },
          { name: '📥 RX (Download)', value: `${formatBits(currentRx)}/s`, inline: true },
          { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false }
        )
        .setColor('Blue')
        .setTimestamp();

      bandwidthChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('monitorBandwidth error:', err);
  }
}

async function pollLogs() {
  if (!mikrotikConnection.connected) return;

  try {
    const logs = await mikrotikConnection.write('/log/print');

    let newLogs = [];
    for (const logEntry of logs) {
      if (logEntry['.id'] === lastLogId) break;
      newLogs.unshift(logEntry);
    }

    if (newLogs.length > 0) {
      lastLogId = newLogs[newLogs.length - 1]['.id'];

      newLogs.forEach(logEntry => {
        const message = logEntry.message || 'No Message';
        const topics = logEntry.topics || 'No Topic';
        const routerTime = logEntry.time || 'Unknown';
        const dateTime = getLocalDateTime();

        const embed = new EmbedBuilder()
          .setTitle('📝 MikroTik Log Entry')
          .addFields(
            { name: '📅 Tanggal Lokal', value: dateTime, inline: true },
            { name: '🕐 Waktu Router', value: routerTime, inline: true },
            { name: '🏷️ Topics', value: `\`${topics}\``, inline: false },
            { name: '💬 Message', value: `\`\`\`${message}\`\`\``, inline: false }
          )
          .setColor(getLogColor(topics))
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      });
    }
  } catch (err) {
    console.error('pollLogs error:', err);
  }
}

function getLogColor(topics) {
  if (!topics) return 0x95a5a6; // Grey for unknown

  if (topics.includes('error')) return 0xe74c3c;       // Red
  if (topics.includes('warning')) return 0xf39c12;     // Orange
  if (topics.includes('info')) return 0x3498db;        // Blue
  if (topics.includes('debug')) return 0x9b59b6;       // Purple
  if (topics.includes('system')) return 0x2ecc71;      // Green

  return 0x95a5a6; // Default grey
}

function formatBits(bits) {
  if (bits === 0 || isNaN(bits)) return '0 bps';
  const k = 1000;
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  const i = Math.floor(Math.log(bits) / Math.log(k));
  return parseFloat((bits / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatMemory(bytes) {
  if (bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getLocalDateTime() {
  return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  monitoringChannel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
  logChannel = client.channels.cache.get(process.env.DISCORD_LOG_CHANNEL_ID);
  bandwidthChannel = client.channels.cache.get(process.env.DISCORD_BANDWIDTH_CHANNEL_ID);

  if (!monitoringChannel || !logChannel || !bandwidthChannel) {
    console.error('One or more Discord channels not found. Please check .env channel IDs.');
    return;
  }

  await connectMikrotik();

  setInterval(monitorMikrotik, parseInt(process.env.CHECK_INTERVAL));
  setInterval(pollLogs, parseInt(process.env.LOG_POLL_INTERVAL));
});

client.login(process.env.DISCORD_TOKEN);
