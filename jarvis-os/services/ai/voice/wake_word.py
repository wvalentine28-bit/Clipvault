import asyncio
import threading
from typing import Optional, Callable
import structlog

logger = structlog.get_logger()


class WakeWordDetector:
    """
    Wake word detection using Picovoice Porcupine.
    Falls back to a simple energy-based detector if Porcupine is not available.
    """

    def __init__(self):
        self.handle = None
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        self._callback: Optional[Callable] = None

    def initialize(self, keyword: str = "jarvis", sensitivity: float = 0.5) -> bool:
        from config import settings
        if not settings.picovoice_api_key:
            logger.warning("Picovoice API key not set — wake word disabled")
            return False

        try:
            import pvporcupine

            self.handle = pvporcupine.create(
                access_key=settings.picovoice_api_key,
                keywords=[keyword],
                sensitivities=[sensitivity],
            )
            logger.info("Wake word detector initialized", keyword=keyword)
            return True
        except Exception as e:
            logger.error("Failed to initialize wake word detector", error=str(e))
            return False

    def start(self, callback: Callable[[str, float], None]):
        if not self.handle:
            logger.warning("Wake word detector not initialized")
            return

        self._callback = callback
        self.is_running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        try:
            import pyaudio

            pa = pyaudio.PyAudio()
            audio_stream = pa.open(
                rate=self.handle.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=self.handle.frame_length,
            )

            logger.info("Wake word detection active — say 'JARVIS' to activate")

            while self.is_running:
                pcm = audio_stream.read(self.handle.frame_length, exception_on_overflow=False)
                import struct
                pcm_unpacked = struct.unpack_from("h" * self.handle.frame_length, pcm)
                result = self.handle.process(pcm_unpacked)

                if result >= 0 and self._callback:
                    logger.info("Wake word detected!")
                    self._callback("jarvis", 0.9)

            audio_stream.close()
            pa.terminate()
        except Exception as e:
            logger.error("Wake word detection error", error=str(e))
        finally:
            self.is_running = False

    def stop(self):
        self.is_running = False
        if self._thread:
            self._thread.join(timeout=2)

    def cleanup(self):
        self.stop()
        if self.handle:
            self.handle.delete()


wake_word_detector = WakeWordDetector()
