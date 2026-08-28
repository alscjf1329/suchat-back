FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# instances:2 클러스터링(ecosystem.config.js)을 유지하기 위해 컨테이너 안에서도 pm2 사용
RUN npm install -g pm2

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js
COPY --from=builder /app/package.json ./package.json

# 업로드 디렉터리(호스트의 /data/suchat를 바인드 마운트) — node:alpine 베이스에 이미 있는
# uid/gid 1000 node 유저가 호스트 sheepduck과 동일해서 그대로 쓰기 가능
RUN mkdir -p /data/suchat/images /data/suchat/temp && chown -R node:node /data/suchat

USER node
EXPOSE 8080
CMD ["pm2-runtime", "ecosystem.config.js"]
