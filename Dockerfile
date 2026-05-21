# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
# Using npm since it's standard
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage (Nginx)
FROM nginx:stable-alpine

# Copy the build output to Nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
