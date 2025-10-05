# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copier package.json
COPY package.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Build de l'application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copier les fichiers buildés
COPY --from=build /app/dist /usr/share/nginx/html

# Copier la configuration nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]