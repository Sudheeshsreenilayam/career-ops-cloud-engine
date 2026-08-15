import fs from 'fs';
import yaml from 'js-yaml';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const cv = fs.readFileSync('./CV.md', 'utf8');
const profile = yaml.load(fs.readFileSync('./config/profile.yml', 'utf8'));
const promptTemplate = fs.readFileSync('./batch/batch-prompt.md', 'utf8');

const prompt = promptTemplate + '\n\nURL: https://job-boards.greenhouse.io\n\nCandidate CV:\n' + cv + '\n\nCandidate Profile:\n' + JSON.stringify(profile);

console.log('Prompt length:', prompt.length);

model.generateContent(prompt).then(res => {
    console.log('Success!', res.response.text().substring(0, 50));
}).catch(err => {
    console.error('ERROR:', err);
});
