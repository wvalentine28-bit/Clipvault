# JARVIS OS

> Just A Rather Very Intelligent System — The closest real-world equivalent to Tony Stark's JARVIS, built with production-grade technology.

[![CI](https://github.com/your-org/jarvis-os/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/jarvis-os/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## What is JARVIS OS?

JARVIS OS is a production-ready, open-source AI personal assistant system featuring:

- **Voice control** with wake word detection and continuous listening
- **Multi-agent AI** orchestration (Research, Coding, Planning, Automation, Memory, Communication)
- **Long-term memory** with vector search across all your conversations and preferences
- **Computer control** — open apps, create files, run scripts, browser automation
- **Internet research** — web search, summarization, report generation
- **Personal productivity** — tasks, goals, projects, calendar, reminders
- **Smart home** integration via Home Assistant
- **Streaming AI** responses with support for Claude, GPT-4o, and more
- **Electron desktop app** with global hotkeys and system tray

---

## Architecture

```
jarvis-os/
├── apps/
│   ├── web/          # Next.js 15 + React 19 dashboard
│   ├── api/          # Node.js + Express backend
│   └── desktop/      # Electron desktop app
├── services/
│   └── ai/           # Python FastAPI — voice, agents, memory
├── packages/
│   ├── database/     # Prisma + PostgreSQL schema
│   ├── shared/       # TypeScript types & utilities
│   └── ui/           # Shared React components
├── docker/           # Dockerfiles
└── .github/          # CI/CD workflows
```

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, TypeScript, Socket.io |
| AI Service | Python, FastAPI, LangChain, LangGraph |
| AI Models | Claude (Anthropic), GPT-4o (OpenAI) |
| Voice | ElevenLabs TTS, Whisper STT, Porcupine wake word |
| Database | PostgreSQL + pgvector, Prisma ORM |
| Cache | Redis |
| Vector DB | ChromaDB (self-hosted) or Pinecone |
| Browser | Playwright |
| Desktop | Electron |
| Monorepo | Turborepo + pnpm workspaces |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 16+ with pgvector extension

### 1. Clone & Install

```bash
git clone https://github.com/your-org/jarvis-os.git
cd jarvis-os
cp .env.example .env
# Edit .env with your API keys
pnpm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres redis chroma
```

### 3. Initialize Database

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### 4. Start Development

```bash
# Start all services
pnpm dev

# Or individually:
pnpm --filter @jarvis/api dev        # API on :3001
pnpm --filter @jarvis/web dev        # Web on :3000
cd services/ai && uvicorn main:app --reload  # AI on :8080
```

### 5. Access

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **AI Service**: http://localhost:8080
- **Default login**: `admin@jarvis.local` / `jarvis1234`

---

## Docker Deployment

```bash
# Development
docker-compose up -d

# Production
NODE_ENV=production docker-compose up -d

# With monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d
```

---

## Configuration

All configuration is via environment variables. See `.env.example` for the complete list.

### Required

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/jarvisdb
JWT_SECRET=your-secret-min-32-chars
NEXTAUTH_SECRET=your-nextauth-secret
```

### AI Providers (at least one required)

```env
ANTHROPIC_API_KEY=sk-ant-...      # Recommended: Claude
OPENAI_API_KEY=sk-...             # Required for Whisper transcription
```

### Voice (optional)

```env
ELEVENLABS_API_KEY=...            # Text-to-speech
PICOVOICE_API_KEY=...             # Wake word detection
```

### Search (optional, enables Research Agent)

```env
TAVILY_API_KEY=...                # Recommended
SERPAPI_API_KEY=...               # Alternative
```

---

## Agent System

JARVIS OS includes 6 specialized agents orchestrated by a central coordinator:

| Agent | Purpose | Key Tools |
|-------|---------|-----------|
| **Research** | Web search, fact-finding, reports | Tavily, SerpAPI, web scraper |
| **Coding** | Code generation, review, debugging | Code analysis, file I/O |
| **Planning** | Tasks, goals, schedules | Task DB, calendar |
| **Automation** | Browser & computer control | Playwright, shell |
| **Memory** | Long-term knowledge retrieval | pgvector, ChromaDB |
| **Communication** | Email, calendar management | Gmail, Google Calendar |

Invoke agents via chat or directly via the API:

```bash
# Via chat
curl -X POST http://localhost:3001/api/v1/agents/research/run \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goal": "Research the latest AI developments in 2025", "stream": true}'
```

---

## Voice Mode

JARVIS OS supports full voice interaction:

1. **Wake word**: Say "JARVIS" to activate (requires Picovoice API key)
2. **Continuous mode**: Click the voice button or press `Ctrl+Shift+J` (desktop)
3. **Streaming TTS**: Responses spoken in real-time via ElevenLabs
4. **Interrupt**: Click stop to interrupt mid-response

---

## API Documentation

### Authentication

```bash
# Register
POST /api/v1/auth/register
{ "email": "user@example.com", "name": "Tony Stark", "password": "secure123" }

# Login
POST /api/v1/auth/login
{ "email": "user@example.com", "password": "secure123" }
# Returns: { token: "jwt...", user: {...} }
```

### Chat

```bash
# Send message (streaming)
POST /api/v1/chat/send
Authorization: Bearer <token>
{ "message": "What's on my task list?", "stream": true }

# Get conversations
GET /api/v1/chat/conversations
```

### Memory

```bash
# Search memories
GET /api/v1/memory/search?q=project+deadlines

# Save memory
POST /api/v1/memory
{ "type": "fact", "content": "I prefer TypeScript over JavaScript" }
```

### Voice

```bash
# Transcribe audio
POST /api/v1/voice/transcribe
Content-Type: multipart/form-data
audio: <file>

# Synthesize speech
POST /api/v1/voice/synthesize
{ "text": "Hello, Tony. Systems online." }
```

### WebSocket Events

Connect to `ws://localhost:3001` with JWT token for real-time events:

```javascript
const socket = io('ws://localhost:3001', { auth: { token } });

// Send message
socket.emit('chat:send', { message: 'Hello JARVIS', model: 'claude-sonnet-4-6' });

// Receive streaming response
socket.on('chat:stream', ({ type, content }) => { ... });
socket.on('chat:done', ({ messageId }) => { ... });

// Voice
socket.emit('voice:audio', audioBuffer);
socket.on('voice:response', ({ text, audio }) => { ... });

// Agents
socket.emit('agent:run', { agentType: 'research', goal: 'Find best JS frameworks 2025' });
socket.on('agent:step', (step) => { ... });
```

---

## Development

### Running Tests

```bash
# All tests
pnpm test

# API unit tests
pnpm --filter @jarvis/api test

# Python tests
cd services/ai && pytest tests/ -v

# E2E tests
pnpm test:e2e
```

### Database

```bash
# Apply schema changes
pnpm db:push

# Create migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

### Adding an Agent

1. Add agent type to `packages/shared/src/types/agent.ts`
2. Add system prompt to `apps/api/src/agents/orchestrator.ts`
3. Create tools in `apps/api/src/agents/tools.ts`
4. Add Python agent in `services/ai/agents/`
5. Register in `apps/api/src/routes/agents.ts`

---

## Security

JARVIS OS implements defense-in-depth security:

- **Authentication**: JWT Bearer + API Key support
- **Authorization**: Role-based (Admin/User/Viewer)
- **Rate limiting**: Per-endpoint and global limits
- **Input validation**: Zod schemas on all endpoints
- **Encryption**: Sensitive data encrypted at rest
- **Audit logs**: All actions logged with user/IP
- **CORS**: Configurable origin whitelist
- **Helmet**: Security headers on all responses
- **Safe shell**: Command allowlist for automation

---

## Smart Home Integration

Connect JARVIS to Home Assistant:

```env
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=your-long-lived-access-token
```

Then control devices via chat:

> "JARVIS, turn on the living room lights and set the thermostat to 72 degrees"

---

## Production Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete production setup including:
- SSL/TLS configuration
- Nginx reverse proxy
- PM2 process management
- Database backups
- Monitoring setup

---

## License

MIT — see [LICENSE](LICENSE)

---

*"Sometimes you gotta run before you can walk."* — Tony Stark
