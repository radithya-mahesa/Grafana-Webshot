FROM node:20.5-alpine

WORKDIR /app

RUN apk --no-cache add chromium curl tzdata

ENV TZ=Asia/Jakarta

COPY package*.json ./

RUN npm install && npm cache clean --force

COPY . .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

CMD node webshot.js
