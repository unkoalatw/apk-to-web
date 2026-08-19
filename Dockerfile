# Web2APK Studio - Dockerfile for Free Cloud Deployment (Render / Railway / Koyeb)
FROM node:18-bullseye-slim

# Install Java JDK and Android Build Tools dependencies
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk-headless \
    android-sdk-platform-tools-common \
    wget \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Setup Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/build-tools/34.0.0

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools ${ANDROID_HOME}/platforms ${ANDROID_HOME}/build-tools/34.0.0 && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools && \
    mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest && \
    rm /tmp/cmdline-tools.zip

# Accept licenses & install build-tools
RUN yes | ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null || true && \
    ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager "build-tools;34.0.0" "platforms;android-34" > /dev/null

# App directory
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
