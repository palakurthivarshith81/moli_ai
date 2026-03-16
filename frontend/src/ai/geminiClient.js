GEMINI_API_KEY = "AIzaSyD7T9aUNoFNeggMBU94JaqUzXCTetEgF1c"
const API_KEY = "";

export async function askGemini(prompt) {

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  console.log("Gemini response:", data);

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}