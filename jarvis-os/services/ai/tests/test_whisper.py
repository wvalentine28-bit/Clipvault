import pytest
import asyncio


@pytest.mark.asyncio
async def test_whisper_service_initialization():
    """Test WhisperService can be imported and initialized"""
    from voice.whisper_service import WhisperService
    service = WhisperService()
    assert service.model is None
    assert service.model_name == "base"


@pytest.mark.asyncio
async def test_whisper_openai_fallback(monkeypatch):
    """Test fallback to OpenAI when whisper package not available"""
    import sys
    # Remove whisper from modules to simulate it not being installed
    whisper_backup = sys.modules.get("whisper")
    sys.modules["whisper"] = None  # type: ignore

    from voice.whisper_service import WhisperService
    service = WhisperService()
    result = service._load_model_sync("base")
    assert result is None

    if whisper_backup:
        sys.modules["whisper"] = whisper_backup
    else:
        del sys.modules["whisper"]
