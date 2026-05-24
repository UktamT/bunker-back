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
    origin: ["http://localhost:5173", "https://uktamt.github.io"],
    methods: ["GET", "POST"],
    credentials: true,
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
  const ip =
    socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;

  const userAgent = socket.handshake.headers["user-agent"];
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent)
    ? "📱 Мобилка"
    : "💻 Комп";

  const lang =
    socket.handshake.headers["accept-language"]?.split(",")[0] || "неизвестно";

  console.log(`--- Новый коннект ---`);
  console.log(` IP-адрес: ${ip}`);
  console.log(` Девайс: ${isMobile}`);
  console.log(` Язык браузера: ${lang}`);
  console.log(`---------------------`);

  const history = readMessages();
  setTimeout(() => {
    io.emit("online_count", io.engine.clientsCount);
  }, 50);
  socket.emit("message_history", history);

  socket.on("send_message", (data) => {
    const messageWithTime = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
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

  socket.on("clear_messages", () => {
    writeMessages([]);
    io.emit("messages_cleared");
  });

  socket.on("disconnect", () => {
    console.log(`Один еблан ливнул ${socket.id}`);
    io.emit("online_count", io.engine.clientsCount);
  });
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
