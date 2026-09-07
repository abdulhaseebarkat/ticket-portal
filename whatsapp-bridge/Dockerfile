FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV AUTH_DIR=/app/auth
CMD ["node", "index.js"]
