import Lobby from "../components/Lobby";
import Ongoing from "../components/Ongoing";
import { useGetUserGameQuery } from "../context/services/game.service";

const Game = () => {
  const { data: data = {} } = useGetUserGameQuery();
  const activeGame = data.data;
  if(!activeGame){
    window.location.href = "/"
  }

  return (
    <div className="game">
      {activeGame?.status === "lobby" ||
      activeGame?.status === "waiting_next_round" ? (
        <Lobby />
      ) : activeGame?.status === "ongoing" ? (
        <Ongoing />
      ) : (
        <p>Game</p>
      )}
    </div>
  );
};

export default Game;
