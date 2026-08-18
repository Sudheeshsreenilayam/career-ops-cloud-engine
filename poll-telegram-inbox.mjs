import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

// State tracking for processed update_id
const stateFile = path.join(process.cwd(), "data", "telegram-last-update.json");
let lastUpdateId = 0;
if (fs.existsSync(stateFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    lastUpdateId = data.lastUpdateId || 0;
  } catch (e) {}
}

async function fetchTelegramUpdates() {
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || [];
}

async function acknowledgeTelegramUpdates(newMaxUpdateId) {
  try {
    // Calling getUpdates with offset = maxUpdateId + 1 tells Telegram to permanently acknowledge and delete those updates from their server queue
    await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${newMaxUpdateId + 1}&limit=1`);
    console.log(`✅ Acknowledged updates up to ${newMaxUpdateId} on Telegram servers.`);
  } catch (e) {
    console.warn("Failed to ack updates on Telegram:", e.message);
  }
}

async function sendTelegramMessage(toChatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: toChatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true
      })
    });
  } catch (e) {
    console.error("Failed to send message:", e.message);
  }
}

async function main() {
  console.log(`📡 Polling Telegram updates since update_id: ${lastUpdateId}...`);
  const updates = await fetchTelegramUpdates();
  console.log(`📥 Received ${updates.length} new Telegram updates.`);

  if (updates.length === 0) {
    console.log("No new messages in Telegram chat. Exiting.");
    return;
  }

  const urlsToProcess = [];

  for (const update of updates) {
    if (update.update_id > lastUpdateId) {
      lastUpdateId = update.update_id;
    }

    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) continue;

    const senderChatId = msg.chat?.id;
    const text = msg.text.trim();

    // Security check: Only process messages from the authorized user
    if (chatId && senderChatId && senderChatId.toString() !== chatId.toString()) {
      console.warn(`⚠️ Ignoring message from unauthorized chat_id: ${senderChatId}`);
      continue;
    }

    // Extract URLs
    const urlMatches = text.match(/(https?:\/\/[^\s\)\|\"]+)/g);
    if (urlMatches) {
      for (const u of urlMatches) {
        urlsToProcess.push({ url: u, chatId: senderChatId });
      }
    } else if (text === "/start" || text.toLowerCase().includes("help")) {
      await sendTelegramMessage(senderChatId, "👋 *Welcome to Career-Ops Bot!*\n\nSimply send or forward any job posting URL here. I will evaluate the fit, add high matches to your private tracker, and send you the scorecard!");
    }
  }

  // Persist updated lastUpdateId locally and acknowledge on Telegram servers
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ lastUpdateId }, null, 2), "utf8");
  await acknowledgeTelegramUpdates(lastUpdateId);

  if (urlsToProcess.length === 0) {
    console.log("No URLs found in the received messages.");
    return;
  }

  console.log(`🚀 Found ${urlsToProcess.length} URLs to evaluate!`);

  for (const item of urlsToProcess) {
    console.log(`\n==============================================`);
    console.log(`Evaluating Telegram link: ${item.url}`);
    await sendTelegramMessage(item.chatId, `⚡ *Evaluating link:* \n${item.url}\n\nRunning AI evaluation...`);

    try {
      execSync(`node eval-single-url.mjs "${item.url}"`, { stdio: "inherit" });
    } catch (err) {
      console.error(`Evaluation failed for ${item.url}:`, err.message);
      await sendTelegramMessage(item.chatId, `❌ Evaluation encountered an issue for: ${item.url}`);
    }
  }
}

main();
