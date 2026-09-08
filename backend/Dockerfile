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

CMD ["node", "dist/server.js"]