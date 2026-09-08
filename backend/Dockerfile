FROM node:20-slim

# Install LibreOffice, poppler-utils (pdftoppm), and other conversion deps
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    poppler-utils \
    fonts-dejavu-core \
    fonts-liberation \
    fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm approve-scripts sharp

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create storage directories
RUN mkdir -p uploads outputs logs

EXPOSE 3001

CMD ["node", "dist/server.js"]
