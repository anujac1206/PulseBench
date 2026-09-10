FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y openssl libssl-dev && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss && node dist/server.js"]