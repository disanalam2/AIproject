const apiKey = process.env.GEMINI_API_KEY;

async function run() {
  const prompt = "Say hello to World";
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    })
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}
run();
