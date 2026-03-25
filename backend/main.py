from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ai_planner import generate_plan, generate_plan_stream

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    mode: str = "free"


# NORMAL API
@app.post("/chat")
async def chat(req: ChatRequest):
    return await generate_plan(req.message, req.mode)


# STREAM API
@app.post("/chat_stream")
async def chat_stream(req: ChatRequest):

    async def generator():
        async for chunk in generate_plan_stream(req.message, req.mode):
            yield chunk

    return StreamingResponse(generator(), media_type="text/plain")