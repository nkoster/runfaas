FROM --platform=${TARGETPLATFORM:-linux/amd64} node:12.13.0-alpine as ship

WORKDIR /app

COPY server.js server.js
COPY functions/ functions/
COPY node_modules/ node_modules/
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY public/ public/
COPY ui/ ui/
COPY .env .env

RUN \
    apk --no-cache add curl ca-certificates && \
    addgroup -S app && adduser -S -g app app && \
    mkdir -p /app && \
    npm i && \
    chown app:app -R /app && \
    chmod 777 /tmp

RUN rm .env

USER app

CMD ["/usr/local/bin/node", "server.js"]
