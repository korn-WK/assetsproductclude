FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm ci

# สำคัญ! เพื่อให้ไฟล์ทั้งหมดเข้า container
COPY . .  

EXPOSE 4000

CMD ["npm", "start"]
