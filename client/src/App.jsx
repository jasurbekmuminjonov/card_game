import { Route, Routes, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Game from "./pages/Game";
import { useGetUserGameQuery } from "./context/services/game.service";
import { useEffect } from "react";
import socket from "./socket";

const App = () => {
  const { data: activeGame = {}, refetch } = useGetUserGameQuery();

  const navigate = useNavigate();
  useEffect(() => {
    if (activeGame.status === "game_found") {
      navigate("/game");
    }
  }, [activeGame, navigate]);

  useEffect(() => {
    socket.on("get_game", () => {
      refetch();
    });

    return () => {
      socket.off("get_game");
    };
  }, [refetch]);

  return (
    <div className="wrapper">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </div>
  );
};

export default App;
