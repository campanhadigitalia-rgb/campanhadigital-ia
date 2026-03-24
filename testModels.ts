import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("No API key found.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    // List available models - this requires an HTTP call since the SDK doesn't expose listModels natively
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log("Available Models:");
    data.models.forEach((m: any) => {
      console.log(`- ${m.name}`);
    });
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

run();
