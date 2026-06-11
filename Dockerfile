FROM node:20-slim

# Install Python + pip for yt-dlp (ffmpeg comes via @ffmpeg-installer/ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && pip3 install yt-dlp --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads/downloads uploads/clips uploads/thumbnails

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
