require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { RouterOSAPI } = require('node-routeros');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let mikrotikConnection;
let mikrotikStatus = 'unknown';
let mikrotikIdentity = 'Unknown Identity';
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
    await fetchIdentity();
  } catch (err) {
    console.error('Failed to connect to MikroTik:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectMikrotik, 5000);
  }
}

async function fetchIdentity() {
  if (!mikrotikConnection.connected) return;
  try {
    const identity = await mikrotikConnection.write('/system/identity/print');
    if (identity && identity.length > 0) {
      mikrotikIdentity = identity[0].name;
      console.log(`✅ Fetched MikroTik Identity: ${mikrotikIdentity}`);

      // Update Discord presence
      client.user.setPresence({
        activities: [{ name: `MikroTik: ${mikrotikIdentity}`, type: 3 }],
        status: 'online'
      });
    }
  } catch (err) {
    console.error('Failed to fetch MikroTik identity:', err);
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
    .setDescription('Perangkat MikroTik telah kembali **ONLINE**.')
    .addFields(
      { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
      { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false },
      { name: '🕒 Uptime', value: info.uptime, inline: true },
      { name: '💻 CPU Load', value: `${info['cpu-load']}%`, inline: true },
      { name: '🧠 Free Memory', value: formatMemory(info['free-memory']), inline: true }
    )
    .setColor('Green')
    .setTimestamp();

  monitoringChannel.send({ content: '@everyone ✅ **MikroTik Kembali Online!**', embeds: [embed] });
}

function sendMikrotikDownAlert() {
  const embed = new EmbedBuilder()
    .setTitle('🔴 MikroTik is OFFLINE')
    .setDescription('🚨 MikroTik tidak dapat diakses. Segera periksa perangkat!')
    .addFields(
      { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
      { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false }
    )
    .setColor('Red')
    .setTimestamp();

  monitoringChannel.send({ content: '@everyone 🚨 **MikroTik Saat Ini OFFLINE!**', embeds: [embed] });
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
          { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
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
        const embed = new EmbedBuilder()
          .setTitle('📝 MikroTik Log Entry')
          .addFields(
            { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
            { name: '📅 Tanggal Lokal', value: getLocalDateTime(), inline: true },
            { name: '🕐 Waktu Router', value: logEntry.time || 'Unknown', inline: true },
            { name: '🏷️ Topics', value: `\`${logEntry.topics || 'No Topic'}\``, inline: false },
            { name: '💬 Message', value: `\`\`\`${logEntry.message || 'No Message'}\`\`\``, inline: false }
          )
          .setColor(getLogColor(logEntry.topics))
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      });
    }
  } catch (err) {
    console.error('pollLogs error:', err);
  }
}

function getLogColor(topics) {
  if (!topics) return 0x95a5a6;
  if (topics.includes('error')) return 0xe74c3c;
  if (topics.includes('warning')) return 0xf39c12;
  if (topics.includes('info')) return 0x3498db;
  if (topics.includes('debug')) return 0x9b59b6;
  if (topics.includes('system')) return 0x2ecc71;
  return 0x95a5a6;
}

function formatBits(bits) {
  if (!bits) return '0 bps';
  const k = 1000;
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  const i = Math.floor(Math.log(bits) / Math.log(k));
  return (bits / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function formatMemory(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
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
    console.error('❌ Channel not found. Please check channel IDs.');
    return;
  }

  await connectMikrotik();

  setInterval(monitorMikrotik, parseInt(process.env.CHECK_INTERVAL));
  setInterval(pollLogs, parseInt(process.env.LOG_POLL_INTERVAL));
  setInterval(fetchIdentity, 60000); // refresh identity tiap 1 menit
});

client.login(process.env.DISCORD_TOKEN);
