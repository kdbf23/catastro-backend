# Base image
FROM node:20.11.0

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Copia el archivo .env.example y renómbralo a .env
COPY .env.example .env

# Expose the port on which the app will run
EXPOSE 4000

# Start the server
CMD ["node", "src/server.js"]
# Start the server using the production build
#CMD ["npm", "run", "start:prod"]
