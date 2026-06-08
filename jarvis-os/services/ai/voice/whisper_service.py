import asyncio
import io
import tempfile
import os
from typing import Optional
import structlog

logger = structlog.get_logger()


class WhisperService:
    def __init__(self):
        self.model = None
        self.model_name = "base"
        self._lock = asyncio.Lock()

    async def load_model(self, model_name: str = "base"):
        async with self._lock:
            if self.model is not None:
                return

            from config import settings
            model_name = settings.whisper_model

            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                None, self._load_model_sync, model_name
            )
            self.model_name = model_name
            logger.info("Whisper model loaded", model=model_name)

    def _load_model_sync(self, model_name: str):
        try:
            import whisper
            return whisper.load_model(model_name)
        except ImportError:
            logger.warning("Whisper not installed, using OpenAI API fallback")
            return None

    async def transcribe(
        self,
        audio_data: bytes,
        mime_type: str = "audio/webm",
        language: Optional[str] = None,
    ) -> dict:
        if self.model is None:
            return await self._transcribe_openai(audio_data, mime_type, language)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._transcribe_sync,
            audio_data,
            language,
        )

    def _transcribe_sync(self, audio_data: bytes, language: Optional[str] = None) -> dict:
        import tempfile
        import numpy as np

        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_data)
            tmp_path = f.name

        try:
            options = {}
            if language:
                options["language"] = language

            result = self.model.transcribe(tmp_path, **options)
            return {
                "text": result["text"].strip(),
                "language": result.get("language", "en"),
                "segments": [
                    {
                        "id": s["id"],
                        "text": s["text"],
                        "start": s["start"],
                        "end": s["end"],
                    }
                    for s in result.get("segments", [])
                ],
                "duration": result.get("duration", 0),
            }
        finally:
            os.unlink(tmp_path)

    async def _transcribe_openai(
        self,
        audio_data: bytes,
        mime_type: str = "audio/webm",
        language: Optional[str] = None,
    ) -> dict:
        from config import settings
        import openai

        if not settings.openai_api_key:
            raise ValueError("No transcription service available")

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        audio_file = io.BytesIO(audio_data)
        audio_file.name = f"audio.{mime_type.split('/')[-1]}"

        kwargs = {"model": "whisper-1", "response_format": "verbose_json"}
        if language:
            kwargs["language"] = language

        result = await client.audio.transcriptions.create(
            file=audio_file,  # type: ignore
            **kwargs,
        )

        return {
            "text": result.text,
            "language": getattr(result, "language", "en"),
            "segments": [],
            "duration": getattr(result, "duration", 0),
        }


whisper_service = WhisperService()
