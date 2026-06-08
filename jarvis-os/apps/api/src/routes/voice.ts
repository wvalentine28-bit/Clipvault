import { Router, Request, Response } from "express";
import multer from "multer";
import { transcribeAudio } from "../services/openai";
import { synthesizeSpeech, getAvailableVoices } from "../services/elevenlabs";
import { runOrchestratorStream } from "../agents/orchestrator";
import { AppError } from "../middleware/errorHandler";
import { createSuccessResponse } from "@jarvis/shared";
import { chatRateLimiter } from "../middleware/rateLimiter";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = ["audio/webm", "audio/mp3", "audio/wav", "audio/ogg", "audio/mpeg"];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post(
  "/transcribe",
  chatRateLimiter,
  upload.single("audio"),
  async (req: Request, res: Response, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, "BAD_REQUEST", "Audio file required");
      }

      const transcript = await transcribeAudio(req.file.buffer, req.file.mimetype);
      res.json(createSuccessResponse({ text: transcript }));
    } catch (err) {
      next(err);
    }
  }
);

router.post("/synthesize", chatRateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { text, voiceId, stability, similarityBoost } = req.body;

    if (!text) throw new AppError(400, "BAD_REQUEST", "Text required");

    const audioBuffer = await synthesizeSpeech(text, voiceId, {
      stability: stability || 0.5,
      similarity_boost: similarityBoost || 0.75,
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.send(audioBuffer);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/process",
  chatRateLimiter,
  upload.single("audio"),
  async (req: Request, res: Response, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, "BAD_REQUEST", "Audio file required");
      }

      const transcript = await transcribeAudio(req.file.buffer, req.file.mimetype);

      let response = "";
      await runOrchestratorStream(
        req.user!.id,
        transcript,
        [],
        {
          onDelta: (delta) => { response += delta; },
        }
      );

      const audioBuffer = await synthesizeSpeech(response);

      res.json(
        createSuccessResponse({
          transcript,
          response,
          audioBase64: audioBuffer.toString("base64"),
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

router.get("/voices", async (req: Request, res: Response, next) => {
  try {
    const voices = await getAvailableVoices();
    res.json(createSuccessResponse(voices));
  } catch (err) {
    next(err);
  }
});

router.post("/synthesize/stream", chatRateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { text, voiceId } = req.body;
    if (!text) throw new AppError(400, "BAD_REQUEST", "Text required");

    const { streamSpeech } = await import("../services/elevenlabs");
    const stream = await streamSpeech(text, voiceId);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
