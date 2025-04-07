FROM oven/bun:1 as builder

WORKDIR /app
COPY package.json .
COPY src/ src/

RUN bun install

FROM oven/bun:1-slim

WORKDIR /app
COPY --from=builder /app .

ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"] 