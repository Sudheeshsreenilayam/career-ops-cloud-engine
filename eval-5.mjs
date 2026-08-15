import { execSync } from 'child_process';
import { fetch } from 'undici'; // Built into newer Node.js global fetch, but we'll use node fetch
import * as cheerio from 'cheerio';

const urls = [
  'https://jobs.ashbyhq.com/vapi/adbc573f-7267-491e-8671-4d5470238aae',
  'https://jobs.ashbyhq.com/elevenlabs/275f43d0-b62d-401d-830c-7c1ac0e688aa',
  'https://job-boards.greenhouse.io/arizeai/jobs/5792327004',
  'https://job-boards.greenhouse.io/anthropic/jobs/5079540008'
];

async function extractText(url) {
  const res = await globalThis.fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe').remove();
  let text = $('body').text().replace(/\s+/g, ' ').trim();
  return `URL: ${url}\n\n${text}`;
}

import fs from 'fs';
async function run() {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[${i+1}/5] Evaluating: ${url}`);
    try {
      const jdText = await extractText(url);
      fs.writeFileSync(`tmp-jd-${i}.txt`, jdText);
      execSync(`node --env-file=.env gemini-eval.mjs --file tmp-jd-${i}.txt`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to evaluate ${url}`, e.message);
    }
  }
}
run();
