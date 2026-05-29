# Node environment base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency graphs
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose backend quantum socket port
EXPOSE 5000

# Start server node
CMD [ "npm", "start" ]
