import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;

async function translateFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    console.log('Translating ' + filePath + '...');
    
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Translate the following file to English. Keep all markdown structure, markdown links, code blocks, brackets, emojis and specific system keywords (like "pipeline.md", "oferta.md" filenames if they are used as references) intact. Only translate the human text, especially if it is instructions for a system or a README:\\n\\n' + content }]}]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            let translated = data.candidates[0].content.parts[0].text;
            // Remove optional markdown code block wrapping from the output
            if (translated.startsWith('\\\markdown')) {
                translated = translated.replace(/^\\\markdown\n/,'').replace(/\n\\\\n?$/,'');
            }
            await fs.writeFile(filePath, translated, 'utf8');
            console.log('? Translated ' + filePath);
        } else {
            console.error('? Failed to translate ' + filePath, data);
        }
    } catch (e) {
        console.error('? Error for ' + filePath, e);
    }
}

async function run() {
    const m = ['README.md', 'batch/batch-prompt.md', 'Prompt.md'];
    const modesDir = await fs.readdir('modes');
    for (const file of modesDir) {
        if (file.endsWith('.md')) { // only files, not fr/de folders
            m.push(path.join('modes', file));
        }
    }

    for (const f of m) {
        if (!(await fs.stat(f).catch(() => null))) continue;
        await translateFile(f);
    }
    console.log('All done.');
}

run();
