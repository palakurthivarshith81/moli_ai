from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_planner import generate_plan

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat(req: ChatRequest):

    try:
        plan = await generate_plan(req.message)
        return plan

    except Exception as e:
        print("Planner error:", e)

        return {
            "text": "Planner failed to generate action.",
            "actions": []
        }