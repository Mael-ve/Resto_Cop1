FROM node:20-alpine

WORKDIR /Site

COPY package*.json ./

RUN npm install -g nodemon
RUN npm install

COPY . .

EXPOSE 8000

ENTRYPOINT ["nodemon", "src/index.js"] 
CMD ["npm", "run", "dev"]