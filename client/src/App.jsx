import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io(`http://${window.location.hostname}:5000`);

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [game, setGame] = useState(null);
  const [role, setRole] = useState("");

  const winSound = useRef(
    new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg")
  );
  const clickSound = useRef(
    new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg")
  );

  // ✅ Setup listeners once
  useEffect(() => {
    socket.on("role", (r) => setRole(r));

    socket.on("update", (data) => {
      setGame({ ...data });
      if (data.winner) winSound.current.play();
    });

    return () => {
      socket.off("role");
      socket.off("update");
    };
  }, []);

  // ✅ Auto rejoin after refresh
  useEffect(() => {
    const savedRoom = localStorage.getItem("roomId");
    if (savedRoom) {
      setRoomId(savedRoom);
      setJoined(true);
    }
  }, []);

  // ✅ Join room AFTER state ready
  useEffect(() => {
    if (joined && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [joined, roomId]);

  const joinRoom = () => {
    if (!roomId) return;
    localStorage.setItem("roomId", roomId);
    setJoined(true);
  };

  const leaveRoom = () => {
    localStorage.removeItem("roomId");
    setJoined(false);
    setRoomId("");
    setGame(null);
  };

  // 🔥 FIXED HERE
  const handleClick = (index) => {
    if (!game || game.winner) return;
    clickSound.current.play();
    socket.emit("move", { roomId, index });
  };

  // 🔥 FIXED HERE
  const restartGame = () => {
    socket.emit("restart", roomId);
  };

  if (!joined) {
    return (
      <div className="center">
        <div className="card">
          <h1>🎮 Join Room</h1>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
          />
          <button onClick={joinRoom}>Join</button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game">
        <h2>Loading Game...</h2>
      </div>
    );
  }

  return (
    <div className="game">
      <h1>Room: {roomId}</h1>
      <h2>Your Role: {role}</h2>

      <div className="leaderboard">
        🏆 X: {game.scores.X} | O: {game.scores.O}
      </div>

      {game.winner ? (
        <h2 className="winner">🎉 Winner: {game.winner}</h2>
      ) : (
        <h3>Turn: {game.isXTurn ? "X" : "O"}</h3>
      )}

      <div className="board">
        {game.board.map((value, index) => {
  const isWinning =
    game.winningPattern &&
    game.winningPattern.includes(index);

  return (
    <div
      key={index}
      className={`cell ${isWinning ? "winning" : ""}`}
      onClick={() => handleClick(index)}
    >
      {value}
    </div>
  );
})}
      </div>

      <button className="restart" onClick={restartGame}>
        Restart
      </button>

      <button className="restart" onClick={leaveRoom}>
        Leave Room
      </button>
    </div>
  );
}

export default App;