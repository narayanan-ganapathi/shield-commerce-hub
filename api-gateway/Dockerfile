FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Enterprise Compliance Hardening: Drop administrative root execution levels
USER node

EXPOSE 3000
CMD ["node", "server.js"]
