import { GoogleGenerativeAI } from '@google/generative-ai';

const key = "AIzaSyCGqr3nPu8NTl1xf4M7w_KLEqAJPNSUCQE";
const genAI = new GoogleGenerativeAI(key);

async function test() {
  const m = 'gemini-flash-latest';
  try {
    console.log(`Testing ${m}...`);
    const model = genAI.getGenerativeModel({ model: m });
    const res = await model.generateContent("Ping");
    console.log(`SUCCESS: ${m}`);
  } catch(e) {
    console.log(`FAILED: ${m} -> ${e.message}`);
  }
}
test();
