FROM node:20-bullseye-slim

# Install Python, pip, ffmpeg, and other system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip globally
RUN pip3 install --break-system-packages -U yt-dlp

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies (production only)
RUN npm ci --omit=dev

# Copy the rest of the application files
COPY . .

# Expose the server port
EXPOSE 3000

# Run the Node server
CMD ["node", "server.js"]
