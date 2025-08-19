require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { RouterOSAPI } = require('node-routeros');
const cron = require('node-cron');
const ftp = require('basic-ftp');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let mikrotikConnection;
let mikrotikStatus = 'unknown';
let mikrotikIdentity = 'Unknown Identity';
let monitoringChannel, logChannel, systemLogChannel, bandwidthChannel, backupChannel;
let lastLogTime = null;
let isBackupRunning = false;

const mentionUsers = process.env.DISCORD_MENTION_USER_IDS
  ? process.env.DISCORD_MENTION_USER_IDS.split(',').map(id => `<@${id.trim()}>`).join(' ')
  : '';

/* ===================== Helper ===================== */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function ts() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function getLocalDateTime() {
  return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
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

// untuk menampilkan ukuran file lokal (mirip formatMemory, tapi terpisah biar jelas maksudnya)
function formatBytes(bytes) {
  return formatMemory(bytes);
}

function safeUnlink(p) { try { fs.existsSync(p) && fs.unlinkSync(p); } catch {} }

function ensureDirExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
    else { try { fs.chmodSync(dirPath, 0o700); } catch {} }
  } catch (e) {
    console.error('Gagal membuat folder backup:', dirPath, e);
    throw e;
  }
}

function cleanBackupDirOlderThan(days = 7) {
  try {
    const dir = global.__BACKUP_DIR__ || process.env.BACKUP_DIR || path.join(__dirname, 'tmp_backups');
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    const ttl = days * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      try {
        const st = fs.statSync(p);
        if (st.isFile() && (now - st.mtimeMs) > ttl) fs.unlinkSync(p);
      } catch {}
    }
  } catch (e) {
    console.warn('Housekeeping gagal:', e.message || e);
  }
}

/* ===================== MikroTik API ===================== */
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
  if (!mikrotikConnection?.connected) return;
  try {
    const identity = await mikrotikConnection.write('/system/identity/print');
    if (identity?.length) {
      mikrotikIdentity = identity[0].name;
      if (client?.user) {
        client.user.setPresence({
          activities: [{ name: `MikroTik: ${mikrotikIdentity}`, type: 3 }],
          status: 'online'
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch MikroTik identity:', err);
  }
}

/* ===================== Monitoring ===================== */
async function monitorMikrotik() {
  if (!mikrotikConnection?.connected) {
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
  if (Number.isFinite(threshold) && cpuLoad >= threshold) {
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
  if (!mikrotikConnection?.connected) return;

  try {
    const interfaceName = process.env.MONITOR_INTERFACE;
    const maxBandwidth = parseInt(process.env.MAX_BANDWIDTH_MBPS);
    const traffic = await mikrotikConnection.write('/interface/monitor-traffic', [
      `=interface=${interfaceName}`,
      '=once='
    ]);

    if (traffic.length > 0) {
      const iface = traffic[0];
      const txMbpsNum = parseInt(iface['tx-bits-per-second']) / 1_000_000;
      const rxMbpsNum = parseInt(iface['rx-bits-per-second']) / 1_000_000;
      const txMbps = txMbpsNum.toFixed(2);
      const rxMbps = rxMbpsNum.toFixed(2);

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

      if (Number.isFinite(maxBandwidth) && (txMbpsNum >= maxBandwidth || rxMbpsNum >= maxBandwidth)) {
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

/* ===================== Log MikroTik ===================== */
async function pollLogs() {
  if (!mikrotikConnection?.connected) return;

  try {
    const logs = await mikrotikConnection.write('/log/print');
    let newLogs = [];

    for (const logEntry of logs) {
      const logTime = logEntry.time;
      if (!logTime) continue;

      const [hours, minutes, seconds] = logTime.split(':').map(Number);
      const logSeconds = hours * 3600 + minutes * 60 + seconds;

      if (!lastLogTime || logSeconds > lastLogTime) newLogs.push(logEntry);
    }

    if (newLogs.length > 0) {
      const latestLog = newLogs[newLogs.length - 1];
      const [h, m, s] = latestLog.time.split(':').map(Number);
      lastLogTime = h * 3600 + m * 60 + s;

      newLogs.forEach(logEntry => {
        const embed = new EmbedBuilder()
          .setTitle('📝 MikroTik Log Entry')
          .addFields(
            { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
            { name: '📅 Tanggal Lokal', value: getLocalDateTime(), inline: true },
            { name: '🕐 Waktu Router', value: logEntry.time || 'Unknown', inline: true },
            { name: '🏷️ Topics', value: `\`${logEntry.topics || 'No Topic'}\``, inline: false },
            { name: '💬 Message', value: `\`\`\`${logEntry.message || 'No Message'}\`\`\`` , inline: false }
          )
          .setColor(getLogColor(logEntry.topics))
          .setTimestamp();

        if (logEntry.topics?.includes('system')) systemLogChannel.send({ content: `${mentionUsers}`, embeds: [embed] });
        logChannel.send({ embeds: [embed] });
      });
    }
  } catch (err) {
    console.error('pollLogs error:', err);
  }
}

/* ===================== Backup (.rsc & .backup) – FTP ===================== */
async function makeRouterBackups() {
  if (!mikrotikConnection?.connected) {
    console.warn('Skip backup: MikroTik tidak terkoneksi.');
    return;
  }
  if (isBackupRunning) {
    console.warn('Backup sedang berjalan, skip tumpang tindih.');
    return;
  }
  isBackupRunning = true;

  const prefix = process.env.BACKUP_NAME_PREFIX || 'backup';
  const stamp = ts();
  const baseName = `${prefix}-${stamp}`;

  const rscName = `${baseName}.rsc`;
  const bakName = `${baseName}.backup`;

  try {
    // 1) Buat .rsc (export konfigurasi). Jika ingin menyembunyikan data sensitif, pakai '=hide-sensitive='
    await mikrotikConnection.write('/export', [`=file=${baseName}`]);

    // 2) Buat .backup (binary)
    const backupArgs = [`=name=${baseName}`];
    if (process.env.BACKUP_PASSWORD && process.env.BACKUP_PASSWORD.trim()) {
      backupArgs.push(`=password=${process.env.BACKUP_PASSWORD.trim()}`);
    }
    await mikrotikConnection.write('/system/backup/save', backupArgs);

    // 3) Tunggu file ada di /file
    await waitFilesExist([rscName, bakName], 30_000);

    // 4) Download via FTP ke folder lokal
    const localDir = global.__BACKUP_DIR__ || process.env.BACKUP_DIR || path.join(__dirname, 'tmp_backups');
    ensureDirExists(localDir);
    const localRsc = path.join(localDir, rscName);
    const localBak = path.join(localDir, bakName);

    await downloadFilesViaFtp([
      { remote: `/${rscName}`, local: localRsc },
      { remote: `/${bakName}`, local: localBak }
    ]);

    // 5) Kirim ke Discord (attachments ditampilkan di dalam embed)
    await sendBackupsToDiscord({ localRsc, localBak, rscName, bakName });

    // 6) Hapus file di router
    await removeRouterFiles([rscName, bakName]);

    // 7) Hapus lokal
    safeUnlink(localRsc);
    safeUnlink(localBak);

    console.log('✅ Backup selesai, terkirim & dihapus (router + lokal).');
  } catch (err) {
    console.error('❌ Backup gagal:', err);
  } finally {
    isBackupRunning = false;
  }
}

async function waitFilesExist(names, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const files = await mikrotikConnection.write('/file/print');
      const set = new Set((files || []).map(f => f.name));
      const allExist = names.every(n => set.has(n));
      if (allExist) return;
    } catch {}
    await delay(1000);
  }
  throw new Error(`File belum muncul setelah ${timeoutMs/1000}s: ${names.join(', ')}`);
}

async function downloadFilesViaFtp(list) {
  const client = new ftp.Client(20000); // timeout 20s
  client.ftp.verbose = false;

  try {
    await client.access({
      host: process.env.MIKROTIK_HOST,
      port: parseInt(process.env.MIKROTIK_FTP_PORT || '21', 10),
      user: process.env.MIKROTIK_USER,
      password: process.env.MIKROTIK_PASS,
      secure: false,              // RouterOS v6: FTP plain
      passive: true               // gunakan passive mode (umumnya aman di NAT)
    });

    for (const item of list) {
      await client.downloadTo(item.local, item.remote);
    }
  } finally {
    client.close();
  }
}

async function sendBackupsToDiscord({ localRsc, localBak, rscName, bakName }) {
  if (!backupChannel) throw new Error('Backup channel tidak ditemukan.');

  // Hitung ukuran file supaya ditampilkan di embed
  let rscSize = 0, bakSize = 0;
  try { rscSize = fs.statSync(localRsc).size; } catch {}
  try { bakSize = fs.statSync(localBak).size; } catch {}

  const embed = new EmbedBuilder()
    .setTitle('🗂️ MikroTik Backup Terkini')
    .setDescription('File backup terbaru tersedia di bawah ini (klik untuk mengunduh):')
    .addFields(
      { name: '🏷️ Identity', value: mikrotikIdentity, inline: true },
      { name: '📅 Waktu Backup', value: getLocalDateTime(), inline: true },
      { name: '📄 File .rsc', value: `(${rscName}) • ${formatBytes(rscSize)}`, inline: false },
      { name: '📄 File .backup', value: `(${bakName}) • ${formatBytes(bakSize)}`, inline: false },
      { name: 'ℹ️ Catatan', value: '`.rsc` diexport **TANPA hide-sensitive**. `.backup` dapat diproteksi password bila `BACKUP_PASSWORD` diisi.' }
    )
    .setColor('Aqua')
    .setTimestamp();

  await backupChannel.send({
    content: mentionUsers || undefined,
    embeds: [embed],
    files: [
      { attachment: localRsc, name: rscName },  // attachment untuk link di embed
      { attachment: localBak, name: bakName }
    ]
  });
}

async function removeRouterFiles(names) {
  for (const n of names) {
    try {
      await mikrotikConnection.write('/file/remove', [`=numbers=${n}`]);
    } catch (e) {
      console.warn(`Gagal hapus ${n} di router:`, e.message || e);
    }
  }
}

/* ===================== Discord ready & scheduler ===================== */
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  monitoringChannel   = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
  logChannel          = client.channels.cache.get(process.env.DISCORD_LOG_CHANNEL_ID);
  systemLogChannel    = client.channels.cache.get(process.env.DISCORD_SYSTEM_LOG_CHANNEL_ID);
  bandwidthChannel    = client.channels.cache.get(process.env.DISCORD_BANDWIDTH_CHANNEL_ID);
  backupChannel       = client.channels.cache.get(process.env.DISCORD_BACKUP_CHANNEL_ID);

  if (!monitoringChannel || !logChannel || !systemLogChannel || !bandwidthChannel || !backupChannel) {
    console.error('❌ Channel not found. Periksa channel IDs (monitor/log/system/bandwidth/backup).');
    return;
  }

  // siapkan folder backup lokal
  const backupDir = process.env.BACKUP_DIR?.trim() || path.join(__dirname, 'tmp_backups');
  ensureDirExists(backupDir);
  global.__BACKUP_DIR__ = backupDir;
  console.log('📁 Folder backup lokal:', backupDir);

  await connectMikrotik();

  setInterval(monitorMikrotik, parseInt(process.env.CHECK_INTERVAL));
  setInterval(pollLogs, parseInt(process.env.LOG_POLL_INTERVAL));
  setInterval(fetchIdentity, parseInt(process.env.IDENTITY_REFRESH_INTERVAL));

  // Cron: default 00:00 WIB setiap hari (bisa diubah di .env)
  const cronExpr = process.env.BACKUP_CRON || '0 0 * * *';
  const cronTz   = process.env.BACKUP_CRON_TZ || 'Asia/Jakarta';

  cron.schedule(cronExpr, async () => {
    console.log(`⏳ Cron backup jalan (${cronExpr}, TZ=${cronTz})...`);
    try {
      cleanBackupDirOlderThan(7);  // opsional housekeeping
      await makeRouterBackups();
      console.log('✅ Backup selesai via cron.');
    } catch (e) {
      console.error('❌ Backup gagal via cron:', e);
    }
  }, { scheduled: true, timezone: cronTz });

  console.log(`🗓️ Cron backup aktif: "${cronExpr}" (TZ=${cronTz}).`);
});

/* (Opsional) command manual */
client.on('messageCreate', async (msg) => {
  if (!msg.guild || msg.author.bot) return;
  if (msg.content.trim().toLowerCase() === '!backup-now') {
    await msg.reply('⏳ Menjalankan backup...');
    try {
      await makeRouterBackups();
      await msg.reply('✅ Backup selesai & terkirim.');
    } catch (e) {
      await msg.reply('❌ Backup gagal. Cek log bot.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
