import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1' });
model.generateContent('hello').then(res => {
    console.log('v1 (new pattern) Success:', res.response.text());
}).catch(e => {
    console.error('v1 (new pattern) Failed:', e);
});
