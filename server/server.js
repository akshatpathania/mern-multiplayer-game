const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {};

const checkWinner = (board) => {
  const patterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (let pattern of patterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return pattern; // return winning pattern
    }
  }

  return null;
};

io.on("connection", (socket) => {

  socket.on("joinRoom", (roomId) => {

    if (!rooms[roomId]) {
      rooms[roomId] = {
        board: Array(9).fill(""),
        isXTurn: true,
        scores: { X: 0, O: 0 },
        players: [],
        winner: null
      };
    }

    const room = rooms[roomId];
    socket.join(roomId);

    // 🔥 Remove old socket if same user refreshed
    room.players = room.players.filter(p => p.id !== socket.id);

    let role = "spectator";

    if (room.players.length === 0) {
      role = "X";
      room.players.push({ id: socket.id, role });
    }
    else if (room.players.length === 1) {
      role = "O";
      room.players.push({ id: socket.id, role });
    }

    socket.emit("role", role);
    socket.emit("update", room);
  });

  socket.on("move", ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || room.winner) return;

    if (
      room.board[index] === "" &&
      ((room.isXTurn && player.role === "X") ||
        (!room.isXTurn && player.role === "O"))
    ) {
      room.board[index] = player.role;
      room.isXTurn = !room.isXTurn;

      const winningPattern = checkWinner(room.board);

      if (winningPattern) {
        room.winner = room.board[winningPattern[0]];
        room.winningPattern = winningPattern;
        room.scores[room.winner]++;
      }
      io.to(roomId).emit("update", room);
    }
  });

  socket.on("restart", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    room.board = Array(9).fill("");
    room.isXTurn = true;
    room.winner = null;
    room.winningPattern = null;

    io.to(roomId).emit("update", room);
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId].players =
        rooms[roomId].players.filter(p => p.id !== socket.id);

      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
      }
    }
  });

});

server.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000");
});