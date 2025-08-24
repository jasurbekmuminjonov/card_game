import {
  useExitGameMutation,
  useGetUserGameQuery,
  useKickPlayerMutation,
  useStartGameMutation,
} from "../context/services/game.service";
import { l } from "../assets/lang.js";
import { IoMdExit } from "react-icons/io";
import { FaCrown } from "react-icons/fa";
import { LuCrown } from "react-icons/lu";

const Lobby = () => {
  const { data: data = {} } = useGetUserGameQuery();
  const activeGame = data.data;
  const [startGame] = useStartGameMutation();
  const sl = localStorage.getItem("lang") || "ru";
  const [exitGame] = useExitGameMutation();
  const userId = localStorage.getItem("user_id");
  const [kickPlayer] = useKickPlayerMutation();
  return (
    <div className="lobby">
      <p>{activeGame.game_code}</p>
      <p>{l[sl].players}:</p>
      <div className="players">
        {activeGame.players.map((p) => (
          <div className="player" key={p.player._id}>
            {p.player._id === activeGame.host && <FaCrown />}
            <p>@{p.player.username}</p>
            <div className="player_actions">
              <button
                disabled={activeGame.host !== userId}
                onClick={async () => {
                  try {
                    await kickPlayer({ player_id: p.player._id });
                  } catch (err) {
                    console.log(err);
                  }
                }}
              >
                <IoMdExit />
              </button>
              {activeGame.host === userId && (
                <button>
                  <LuCrown />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={startGame}
        disabled={userId !== activeGame.host || activeGame.players.length < 2}
      >
        {l[sl].start_round}
      </button>
      <button
        onClick={async () => {
          try {
            await exitGame().unwrap();
            window.location.href = "/";
          } catch (err) {
            console.log(err);
          }
        }}
        style={{ fontSize: "12px" }}
      >
        {l[sl].exit_game}
      </button>
    </div>
  );
};

export default Lobby;
