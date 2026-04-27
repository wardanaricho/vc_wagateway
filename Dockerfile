FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/
COPY node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]