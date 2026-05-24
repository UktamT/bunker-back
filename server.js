import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import fs from "fs";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());

const server = http.createServer(app);
const FILE_PATH = "./messages.json";

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const readMessages = () => {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return [];
    }

    const data = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading messages:", error);
    return [];
  }
};

const writeMessages = (messages) => {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error("Error writing messages:", error);
  }
};

io.on("connection", (socket) => {
  console.log(`Зашел один еблан ${socket.id}`);

  const history = readMessages();
  setTimeout(() => {
    io.emit("online_count", io.engine.clientsCount);
  }, 50);
  socket.emit("message_history", history);

  socket.on("send_message", (data) => {
    const messageWithTime = {
      ...data,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const messages = readMessages();
    messages.push(messageWithTime);
    writeMessages(messages);

    io.emit("receive_message", messageWithTime);
  });

  socket.on("disconnect", () => {
    console.log(`Один еблан ливнул ${socket.id}`);
    io.emit("online_count", io.engine.clientsCount);
  });
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
