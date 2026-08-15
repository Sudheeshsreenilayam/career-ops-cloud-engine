import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API Key found.');
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        // We'll use the v1 endpoint to fetch the list
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await response.json();
        console.log('Available Models:', JSON.stringify(data.models?.map(m => m.name), null, 2));
    } catch (err) {
        console.error('Error listing models:', err);
    }
}

listModels();
