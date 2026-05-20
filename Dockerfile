FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM node:20-alpine AS production

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

RUN apk del python3 make g++

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["sh", "-c", "NODE_ENV=production npx knex migrate:latest --knexfile dist/knexfile.js && node dist/server.js"]
