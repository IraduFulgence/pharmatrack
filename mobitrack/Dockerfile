FROM node:20-alpine
WORKDIR /app
RUN npm install -g expo-cli
COPY package*.json ./
RUN npm ci
COPY . .
# Expose the ports Expo needs
EXPOSE 19000 19001 19002 8081
# Start Expo in LAN mode
CMD ["npx", "expo", "start", "--lan"]