const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { User, Vehicle } = require("../models");
const { canUserAccessVehicle } = require("../services/trackingService");
const { onTrackingPosition } = require("../tracking/trackingEvents");

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getAllowedOrigins() {
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://13.211.206.24",
    "http://13.211.206.24:5173",
    "https://supergps.vercel.app",
  ];

  return (process.env.CORS_ORIGIN || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(defaultOrigins)
    .filter((origin, index, origins) => origins.indexOf(origin) === index);
}

function getSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.split(" ")[1];

  return null;
}

function sendAckOrError(ack, socket, event, payload) {
  if (typeof ack === "function") {
    ack(payload);
    return;
  }

  socket.emit(event, payload);
}

function initTrackingSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is required");
      }

      const token = getSocketToken(socket);
      if (!token) {
        return next(new Error("Socket auth token is required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });
      if (!user) {
        return next(new Error("Socket user not found"));
      }

      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error("Socket authorization failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("tracking:connected", {
      success: true,
      userId: socket.user.id,
      role: socket.user.role,
    });

    socket.on("tracking:join", async (payload = {}, ack) => {
      try {
        const { vehicleId } = payload;
        if (!uuidRegex.test(vehicleId || "")) {
          return sendAckOrError(ack, socket, "tracking:error", {
            success: false,
            message: "Valid vehicleId is required",
          });
        }

        const vehicle = await Vehicle.findByPk(vehicleId);
        const hasAccess = await canUserAccessVehicle(socket.user, vehicle);
        if (!vehicle || !hasAccess) {
          return sendAckOrError(ack, socket, "tracking:error", {
            success: false,
            message: "Vehicle not found or not accessible",
          });
        }

        socket.join(`vehicle:${vehicle.id}`);
        return sendAckOrError(ack, socket, "tracking:joined", {
          success: true,
          vehicleId: vehicle.id,
        });
      } catch (err) {
        return sendAckOrError(ack, socket, "tracking:error", {
          success: false,
          message: err.message,
        });
      }
    });

    socket.on("tracking:leave", (payload = {}, ack) => {
      const { vehicleId } = payload;
      if (vehicleId) socket.leave(`vehicle:${vehicleId}`);
      sendAckOrError(ack, socket, "tracking:left", {
        success: true,
        vehicleId,
      });
    });
  });

  onTrackingPosition((payload) => {
    io.to(`vehicle:${payload.vehicleId}`).emit("tracking:position", payload);
    io.to(`vehicle:${payload.vehicleId}`).emit("position:update", payload);
  });

  return io;
}

module.exports = { initTrackingSocket };
