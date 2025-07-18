require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { RouterOSAPI } = require('node-routeros');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let mikrotikConnection;
let mikrotikStatus = 'unknown';
let mikrotikIdentity = 'Unknown Identity';
let monitoringChannel, logChannel, systemLogChannel, bandwidthChannel;
let lastLogTime = null;

const mentionUsers = process.env.DISCORD_MENTION_USER_IDS
  ? process.env.DISCORD_MENTION_USER_IDS.split(',').map(id => `<@${id.trim()}>`).join(' ')
  : '';

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
    setTimeout(connectMikrotik, 5000);
  }
}

async function fetchIdentity() {
  if (!mikrotikConnection.connected) return;
  try {
    const identity = await mikrotikConnection.write('/system/identity/print');
    if (identity && identity.length > 0) {
      mikrotikIdentity = identity[0].name;
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
    if (mikrotikStatus !== 'down') mikrotikStatus = 'down';
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

    checkCpuUsage(info['cpu-load']);
    await monitorBandwidth();
  } catch (err) {
    console.error('monitorMikrotik error:', err);
    if (mikrotikStatus !== 'down') mikrotikStatus = 'down';
    sendMikrotikDownAlert();
  }
}

function checkCpuUsage(cpuLoad) {
  const threshold = parseInt(process.env.CPU_THRESHOLD);
  if (cpuLoad >= threshold) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ CPU Load Warning')
      .setDescription(`CPU Load saat ini **${cpuLoad}%** melebihi batas aman ${threshold}%!`)
      .addFields(
        { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
        { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false }
      )
      .setColor('Orange')
      .setTimestamp();

    monitoringChannel.send({ content: `${mentionUsers} ⚠️ **CPU Usage High!**`, embeds: [embed] });
  }
}

function sendMikrotikUpAlert(info) {
  const embed = new EmbedBuilder()
    .setTitle('🟢 MikroTik is BACK ONLINE')
    .setDescription('Perangkat MikroTik telah kembali **ONLINE.**')
    .addFields(
      { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
      { name: '🕒 Uptime', value: info.uptime, inline: true },
      { name: '💻 CPU Load', value: `${info['cpu-load']}%`, inline: true },
      { name: '🧠 Free Memory', value: formatMemory(info['free-memory']), inline: true },
      { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false }
    )
    .setColor('Green')
    .setTimestamp();

  monitoringChannel.send({ content: `${mentionUsers} ✅ **MikroTik Online!**`, embeds: [embed] });
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

  monitoringChannel.send({ content: `${mentionUsers} 🚨 **MikroTik Offline!**`, embeds: [embed] });
}

async function monitorBandwidth() {
  if (!mikrotikConnection.connected) return;

  try {
    const interfaceName = process.env.MONITOR_INTERFACE;
    const maxBandwidth = parseInt(process.env.MAX_BANDWIDTH_MBPS);
    const traffic = await mikrotikConnection.write('/interface/monitor-traffic', [
      `=interface=${interfaceName}`,
      '=once='
    ]);

    if (traffic.length > 0) {
      const iface = traffic[0];
      const txMbps = (parseInt(iface['tx-bits-per-second']) / 1_000_000).toFixed(2);
      const rxMbps = (parseInt(iface['rx-bits-per-second']) / 1_000_000).toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle(`📡 Bandwidth Monitor: ${interfaceName}`)
        .addFields(
          { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
          { name: '📤 TX (Upload)', value: `${txMbps} Mbps`, inline: true },
          { name: '📥 RX (Download)', value: `${rxMbps} Mbps`, inline: true },
          { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false }
        )
        .setColor('Blue')
        .setTimestamp();

      bandwidthChannel.send({ embeds: [embed] });

      if (txMbps >= maxBandwidth || rxMbps >= maxBandwidth) {
        const alertEmbed = new EmbedBuilder()
          .setTitle('🚨 Bandwidth Alert!')
          .setDescription('🚨 Bandwidth melebihi batas yang ditentukan!')
          .addFields(
            { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
            { name: '📡 Interface', value: `${interfaceName}`, inline: true },
            { name: '📤 TX (Upload)', value: `${txMbps} Mbps`, inline: true },
            { name: '📥 RX (Download)', value: `${rxMbps} Mbps`, inline: true },
            { name: '📅 Tanggal & Waktu', value: getLocalDateTime(), inline: false }
          )
          .setColor('Red')
          .setTimestamp();
        bandwidthChannel.send({ content: `${mentionUsers} 🚨 **Bandwidth Alert!**`, embeds: [alertEmbed] });
      }
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
      const logTime = logEntry.time;
      if (!logTime) continue;

      const [hours, minutes, seconds] = logTime.split(':').map(Number);
      const logSeconds = hours * 3600 + minutes * 60 + seconds;

      if (!lastLogTime || logSeconds > lastLogTime) {
        newLogs.push(logEntry);
      }
    }

    if (newLogs.length > 0) {
      const latestLog = newLogs[newLogs.length - 1];
      const [hours, minutes, seconds] = latestLog.time.split(':').map(Number);
      lastLogTime = hours * 3600 + minutes * 60 + seconds;

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

        if (logEntry.topics?.includes('system')) {
          systemLogChannel.send({ content: `${mentionUsers}`, embeds: [embed] });
        }
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
  systemLogChannel = client.channels.cache.get(process.env.DISCORD_SYSTEM_LOG_CHANNEL_ID);
  bandwidthChannel = client.channels.cache.get(process.env.DISCORD_BANDWIDTH_CHANNEL_ID);

  if (!monitoringChannel || !logChannel || !systemLogChannel || !bandwidthChannel) {
    console.error('❌ Channel not found. Please check channel IDs.');
    return;
  }

  await connectMikrotik();
  setInterval(monitorMikrotik, parseInt(process.env.CHECK_INTERVAL));
  setInterval(pollLogs, parseInt(process.env.LOG_POLL_INTERVAL));
  setInterval(fetchIdentity, parseInt(process.env.IDENTITY_REFRESH_INTERVAL));
});

client.login(process.env.DISCORD_TOKEN);
