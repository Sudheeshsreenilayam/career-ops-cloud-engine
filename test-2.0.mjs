import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
model.generateContent('hello').then(res => {
    console.log('Success:', res.response.text());
}).catch(e => {
    console.error('Failed:', e);
});
