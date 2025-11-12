from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

from routes.chat import router as chat_router
from routes.history import router as history_router
from routes.auth import router as auth_router
from database import init_models


load_dotenv()

app = FastAPI(title="MediBot Backend", default_response_class=JSONResponse)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_models()


app.include_router(chat_router, prefix="")
app.include_router(history_router, prefix="")
app.include_router(auth_router, prefix="/auth")


@app.get("/healthz")
async def healthz():
    return {"ok": True}


