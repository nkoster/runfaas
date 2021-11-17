FROM --platform=${TARGETPLATFORM:-linux/amd64} ubuntu:20.04 as builder

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
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    git \
    gnupg \
    inetutils-ping \
    less \
    locales \
    net-tools \
    nginx \
    openssh-client \
    parallel \
    postgresql-client \
    telnet \
    time \
    tzdata \
    vim-tiny \
    kafkacat \
    netcat \
    wget && \
    rm -rf /var/lib/apt/lists/ && \
    groupadd app && \
    useradd -g app -m -s /bin/bash app && \
    mkdir -p /app && \
    curl -sL https://deb.nodesource.com/setup_17.x  | bash - && \
    apt-get -y install nodejs && \
    npm i && \
    chown app:app -R /app && \
    chmod 777 /tmp

USER app

CMD ["node", "server.js"]
