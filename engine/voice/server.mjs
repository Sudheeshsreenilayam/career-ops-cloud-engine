/**
 * engine/voice/server.mjs
 * Lightweight local server for Free Voice Console (Jobvis)
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.VOICE_PORT || 3333;

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Career-Ops Voice Console (Jobvis)</title>
  <style>
    body {
      margin: 0;
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .orb {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, #58a6ff 0%, #1f6feb 60%, transparent 100%);
      box-shadow: 0 0 35px #58a6ff;
      margin-bottom: 30px;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .orb.listening {
      animation: pulse 1.5s infinite;
      box-shadow: 0 0 60px #2ea043;
      background: radial-gradient(circle, #3fb950 0%, #238636 60%, transparent 100%);
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.12); }
      100% { transform: scale(1); }
    }
    .status { font-size: 1.2rem; margin-bottom: 20px; font-weight: 500; }
    .transcript {
      max-width: 600px;
      min-height: 80px;
      background: #161b22;
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid #30363d;
      font-size: 1rem;
      line-height: 1.5;
      text-align: center;
    }
    .hint { font-size: 0.85rem; color: #8b949e; margin-top: 25px; }
  </style>
</head>
<body>
  <div class="orb" id="voiceOrb" title="Click to speak"></div>
  <div class="status" id="statusText">Click Orb to Speak</div>
  <div class="transcript" id="transcriptBox">"Brief me on my pending follow-ups" or "Triage latest jobs"</div>
  <div class="hint">100% Free • Powered by Web Speech API & Edge Neural Audio</div>

  <script>
    const orb = document.getElementById("voiceOrb");
    const statusText = document.getElementById("statusText");
    const transcriptBox = document.getElementById("transcriptBox");

    let isListening = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        isListening = true;
        orb.classList.add("listening");
        statusText.innerText = "Listening...";
      };

      recognition.onresult = (event) => {
        const text = Array.from(event.results).map(r => r[0].transcript).join("");
        transcriptBox.innerText = text;
      };

      recognition.onend = () => {
        isListening = false;
        orb.classList.remove("listening");
        statusText.innerText = "Thinking...";
        handleVoiceCommand(transcriptBox.innerText);
      };
    }

    orb.addEventListener("click", () => {
      if (!recognition) {
        alert("Speech Recognition not supported in this browser. Please use Chrome or Edge.");
        return;
      }
      if (!isListening) {
        recognition.start();
      } else {
        recognition.stop();
      }
    });

    async function handleVoiceCommand(query) {
      if (!query || query.length < 3) {
        statusText.innerText = "Click Orb to Speak";
        return;
      }
      try {
        const res = await fetch("/api/voice-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query })
        });
        const data = await res.json();
        statusText.innerText = "Speaking...";
        transcriptBox.innerText = data.reply;
        speak(data.reply);
      } catch (err) {
        statusText.innerText = "Error processing voice command";
      }
    }

    function speak(text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        statusText.innerText = "Click Orb to Speak";
      };
      window.speechSynthesis.speak(utterance);
    }
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML_CONTENT);
  } else if (req.method === "POST" && req.url === "/api/voice-query") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { query } = JSON.parse(body);
        let reply = "I am your Career-Ops voice assistant. All systems are operational.";

        if (query.toLowerCase().includes("follow") || query.toLowerCase().includes("pending")) {
          reply = "You have 11 pending applications in your cadence window, with 4 follow-ups recommended this week.";
        } else if (query.toLowerCase().includes("triage") || query.toLowerCase().includes("latest")) {
          reply = "Your latest evaluated role is Service Delivery Manager at Ericsson with a fit score of 4.6 out of 5.";
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply }));
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🎙️ Career-Ops Voice Console running at http://localhost:${PORT}`);
});
