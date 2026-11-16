FROM node:20-alpine

RUN apk add --no-cache bash

WORKDIR /app

# Copy package files first to cache dependencies
COPY package*.json ./

RUN npm install


COPY . .

# Expose Expo ports
EXPOSE 19000 19001 19002 8081

CMD ["npx", "expo", "start", "--lan"]