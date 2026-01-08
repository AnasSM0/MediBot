from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

from routes.chat import router as chat_router
from routes.history import router as history_router
from routes.auth import router as auth_router
from database import init_models, engine
from sqlalchemy import text
from check_config import validate_config

# FAIL-FAST: Validate configuration before app startup
# This prevents the application from booting in a degraded state.
validate_config()

load_dotenv()

app = FastAPI(title="MediBot Backend", default_response_class=JSONResponse)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

from fastapi import Request, Response
import uuid
from utils.logger import set_request_id, setup_logger

logger = setup_logger("main")

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    set_request_id(request_id)
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from services.faiss_search import initialize_faiss_service

@app.on_event("startup")
async def on_startup() -> None:
    await init_models()
    initialize_faiss_service()


app.include_router(chat_router, prefix="")
app.include_router(history_router, prefix="")
app.include_router(auth_router, prefix="/auth")


@app.get("/healthz")
async def healthz():
    try:
        # Check database connection
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": str(e)}
        )


