import asyncio
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import voice, agents, memory, tools

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting JARVIS AI Service", port=settings.port)

    # Initialize vector store
    try:
        from memory.vector_store import vector_store
        await vector_store.initialize()
        logger.info("Vector store initialized")
    except Exception as e:
        logger.warning("Vector store initialization failed", error=str(e))

    # Initialize Whisper model
    try:
        from voice.whisper_service import whisper_service
        await whisper_service.load_model()
        logger.info("Whisper model loaded", model=settings.whisper_model)
    except Exception as e:
        logger.warning("Whisper initialization failed", error=str(e))

    yield

    logger.info("Shutting down JARVIS AI Service")


app = FastAPI(
    title="JARVIS AI Service",
    description="Python microservices for JARVIS OS — voice, agents, memory",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": str(exc)}},
    )


# Health check
@app.get("/health")
async def health():
    status = {"whisper": "unknown", "vector_store": "unknown"}

    try:
        from voice.whisper_service import whisper_service
        status["whisper"] = "up" if whisper_service.model else "not_loaded"
    except Exception:
        status["whisper"] = "error"

    try:
        from memory.vector_store import vector_store
        status["vector_store"] = "up" if vector_store.client else "not_connected"
    except Exception:
        status["vector_store"] = "error"

    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": status,
    }


# Routers
app.include_router(voice.router, prefix="/api/v1/voice", tags=["Voice"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(memory.router, prefix="/api/v1/memory", tags=["Memory"])
app.include_router(tools.router, prefix="/api/v1/tools", tags=["Tools"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
