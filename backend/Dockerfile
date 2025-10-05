FROM node:18-alpine

WORKDIR /app

# Copier package.json
COPY package.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

EXPOSE 5000

# Démarrer l'application
CMD ["npm", "run", "dev"]