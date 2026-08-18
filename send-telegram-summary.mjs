import fs from "fs";
import path from "path";

async function sendTelegramSummary() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("ℹ️  TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured. Skipping summary notification.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const stagedDir = path.join(process.cwd(), "reports", "staged");
  const additionsDir = path.join(process.cwd(), "batch", "tracker-additions");

  let highFitCount = 0;
  let skipCount = 0;
  const topMatches = [];

  if (fs.existsSync(stagedDir)) {
    const files = fs.readdirSync(stagedDir).filter(f => f.endsWith(".md"));
    for (const f of files) {
      const content = fs.readFileSync(path.join(stagedDir, f), "utf8");
      const titleMatch = content.match(/#\s*Evaluation:\s*(.+)/);
      const scoreMatch = content.match(/\*\*Score:\*\*\s*([0-9\.]+)\/5/);
      const urlMatch = content.match(/\*\*URL:\*\*\s*(https?:\/\/[^\s\n\r]+)/);

      const title = titleMatch ? titleMatch[1].trim() : f;
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
      const url = urlMatch ? urlMatch[1].trim() : "";

      if (score >= 4.0) {
        highFitCount++;
        topMatches.push({ title, score, url });
      } else {
        skipCount++;
      }
    }
  }

  // Sort top matches by score descending
  topMatches.sort((a, b) => b.score - a.score);

  // Take top 8 matches for clean mobile readability
  const displayMatches = topMatches.slice(0, 8);

  let msg = `🌅 *Career-Ops Daily Digest (${today})*\n\n`;
  msg += `✨ *New High-Fit Roles Found:* ${highFitCount}\n`;
  msg += `🚫 *Low-Fit/Skipped:* ${skipCount}\n\n`;

  if (displayMatches.length > 0) {
    msg += `🎯 *Top Matches Today:* \n`;
    for (const m of displayMatches) {
      const link = m.url ? `[Apply](${m.url})` : `_No URL_`;
      msg += `• *${m.score}/5* — ${m.title} — ${link}\n`;
    }
    if (topMatches.length > 8) {
      msg += `\n_...and ${topMatches.length - 8} more high-fit matches synced to your tracker!_\n`;
    }
  } else {
    msg += `_No new roles $\\ge 4.0/5$ discovered today._\n`;
  }

  msg += `\n📊 *Action:* Synced to your private GitHub repo. Pull to view and compile tailored LaTeX resumes!`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: "Markdown",
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    if (data.ok) {
      console.log("✅ Telegram daily summary sent successfully!");
    } else {
      console.warn("⚠️ Telegram API returned error:", data);
    }
  } catch (err) {
    console.error("❌ Failed to send Telegram summary:", err.message);
  }
}

sendTelegramSummary();
