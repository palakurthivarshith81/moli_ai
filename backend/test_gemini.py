from google import genai

client = genai.Client()

response = client.models.generate_content(
    model="models/gemini-2.5-flash",
    contents="Say hello from Gemini!"
)

print(response.text)