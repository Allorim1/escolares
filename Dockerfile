FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx ng build --configuration=production --prerender=false


FROM nginx:alpine

RUN apk add --no-cache certbot python3 py3-pip openssl

COPY --from=build /app/dist/escolares/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /var/www/html /etc/letsencrypt/live/test.escolaresonline.com && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/test.escolaresonline.com/privkey.pem \
    -out /etc/letsencrypt/live/test.escolaresonline.com/fullchain.pem \
    -subj "/CN=test.escolaresonline.com" \
    -addext "subjectAltName=DNS:test.escolaresonline.com"

EXPOSE 80 443
