const apiKey = 'AIzaSyCGqr3nPu8NTl1xf4M7w_KLEqAJPNSUCQE';

async function checkModels() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  const models = data.models || [];
  
  console.log("Found", models.length, "models.");
  
  const geminiModels = models.filter(m => m.name.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent"));
  geminiModels.forEach(m => console.log(m.name, m.version));
}

checkModels().catch(console.error);
