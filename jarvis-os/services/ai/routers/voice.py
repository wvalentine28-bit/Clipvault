import io
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from voice.whisper_service import whisper_service

router = APIRouter()


class SynthesizeRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    stability: float = 0.5
    similarity_boost: float = 0.75
    stream: bool = False


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(400, "Invalid audio file")

    audio_data = await audio.read()

    if not whisper_service.model:
        await whisper_service.load_model()

    result = await whisper_service.transcribe(
        audio_data=audio_data,
        mime_type=audio.content_type,
        language=language,
    )

    return {"success": True, "data": result}


@router.post("/synthesize")
async def synthesize(request: SynthesizeRequest):
    from config import settings
    import httpx

    if not settings.elevenlabs_api_key:
        raise HTTPException(503, "ElevenLabs API not configured")

    voice_id = request.voice_id or settings.elevenlabs_voice_id
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    if request.stream:
        url += "/stream"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": request.text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {
                    "stability": request.stability,
                    "similarity_boost": request.similarity_boost,
                },
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            raise HTTPException(response.status_code, f"ElevenLabs error: {response.text}")

        if request.stream:
            return StreamingResponse(
                io.BytesIO(response.content),
                media_type="audio/mpeg",
            )

        return StreamingResponse(
            io.BytesIO(response.content),
            media_type="audio/mpeg",
            headers={"Content-Length": str(len(response.content))},
        )


@router.post("/process")
async def process_voice(audio: UploadFile = File(...)):
    """Full voice pipeline: audio -> transcription -> AI response -> speech"""
    from config import settings
    from agents.research_agent import get_llm
    from langchain_core.messages import HumanMessage, SystemMessage

    audio_data = await audio.read()

    # Transcribe
    if not whisper_service.model:
        await whisper_service.load_model()

    transcription = await whisper_service.transcribe(audio_data, audio.content_type or "audio/webm")
    text = transcription["text"]

    # Generate response
    llm = get_llm()
    messages = [
        SystemMessage(content="You are JARVIS, an advanced AI assistant. Give a concise, helpful voice response."),
        HumanMessage(content=text),
    ]
    response = await llm.ainvoke(messages)
    response_text = response.content

    # Synthesize speech
    audio_base64 = None
    if settings.elevenlabs_api_key:
        import httpx, base64
        voice_id = settings.elevenlabs_voice_id
        async with httpx.AsyncClient() as client:
            tts_response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": settings.elevenlabs_api_key},
                json={"text": response_text, "model_id": "eleven_turbo_v2_5"},
                timeout=30.0,
            )
            if tts_response.status_code == 200:
                audio_base64 = base64.b64encode(tts_response.content).decode()

    return {
        "success": True,
        "data": {
            "transcript": text,
            "response": response_text,
            "audio_base64": audio_base64,
        },
    }
