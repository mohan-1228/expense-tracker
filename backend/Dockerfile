FROM node:22-alpine

WORKDIR /app

# Copy only the package files first, before the rest of the source code.
# Docker caches each instruction as a "layer" - as long as package.json
# and package-lock.json haven't changed, this npm ci layer gets reused
# from cache on rebuilds instead of reinstalling everything from scratch.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5001

CMD ["node", "index.js"]
