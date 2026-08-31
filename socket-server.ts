import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/socket";

function allowedOrigins() {
  return (
    process.env.CLIENT_ORIGIN ||
    "http://localhost:8080,http://localhost:3000,https://liveshare.dev,https://www.liveshare.dev"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const httpServer = createServer();

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins(),
    credentials: true,
  },
  maxHttpBufferSize: 10e6,
});

registerSocketHandlers(io);

if (!process.env.VERCEL) {
  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port);
}

export default httpServer;
