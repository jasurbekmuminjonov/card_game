import { useEffect, useState } from "react";
import {
  useCheckUsernameMutation,
  useRegisterUserMutation,
  // useTransferMoneyMutation,
} from "../context/services/user.service";
import { InputNumber, notification, Slider } from "antd";
import { RiHourglassFill } from "react-icons/ri";
import {
  useCreateGameMutation,
  useJoinGameMutation,
} from "../context/services/game.service";
import { l } from "../assets/lang.js";

const Home = () => {
  const userId = localStorage.getItem("user_id");
  const [gameCode, setGameCode] = useState("");
  const [cardAmount, setCardAmount] = useState(4);
  const [betAmount, setBetAmount] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [username, setUsername] = useState("");
  const [isUsernameTaken, setIsUsernameTaken] = useState(false);
  const sl = localStorage.getItem("lang") || "ru";

  const [registerUser] = useRegisterUserMutation();
  const [checkUsername, { isLoading: usernameLoading }] =
    useCheckUsernameMutation();
  // const [transferMoney] = useTransferMoneyMutation();
  const [createGame] = useCreateGameMutation();
  const [joinGame] = useJoinGameMutation();

  const handleAdd = (amount) => {
    let newAmount = betAmount + amount;
    if (newAmount > 10000) newAmount = 10000;
    if (newAmount < 100) newAmount = 100;
    setBetAmount(newAmount);
  };

  useEffect(() => {
    if (!username) return;

    const check = async () => {
      try {
        const res = await checkUsername({ username }).unwrap();
        if (res.status === "username_is_occupied") {
          setIsUsernameTaken(true);
          notification.error({
            message: l[sl].username_is_occupied,
          });
        } else {
          setIsUsernameTaken(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    check();
  }, [username, checkUsername, sl]);

  async function handleRegister() {
    try {
      if (!username) {
        notification.error({
          message: l[sl].username_missing,
        });
      }
      if (!/^[a-z0-9]+$/.test(username)) {
        notification.error({
          message: l[sl].username_regex,
        });
      }
      const res = await registerUser({ username }).unwrap();
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("user_id", res.data.user_id);
      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  }

  async function handleCreateGame() {
    try {
      await createGame({
        card_count: cardAmount,
        bet_amount: betAmount,
      }).unwrap();
      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  }
  async function handleJoinGame() {
    try {
      await joinGame({
        game_code: gameCode,
      }).unwrap();
      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="home">
      <div className="button-container">
        {userId ? (
          <>
            <div className="join-button">
              <input
                style={{ textTransform: "uppercase" }}
                value={gameCode}
                onChange={(e) => {
                  const text = e.target.value;
                  setGameCode(text.toUpperCase());
                }}
                type="text"
                placeholder={l[sl].game_code}
              />
              <button onClick={handleJoinGame}>{l[sl].join}</button>
            </div>
            <div className="divider"></div>
            <button onClick={handleCreateGame}>{l[sl].host}</button>
            <div className="settings">
              <p>
                {l[sl].card_amount}: {cardAmount}
              </p>
              <Slider
                value={cardAmount}
                min={4}
                max={8}
                onChange={(value) => {
                  if (isDragging) {
                    setCardAmount(value);
                  }
                }}
                onBeforeChange={() => setIsDragging(true)}
                onAfterChange={() => setIsDragging(false)}
                tooltip={{ open: false }}
                styles={{
                  track: {
                    background: "green",
                  },
                }}
              />
              <p>
                {l[sl].bet_amount}: {betAmount}
              </p>
              <InputNumber
                style={{ width: "100%" }}
                size="small"
                min={100}
                value={betAmount}
                onChange={(value) => {
                  value < 100
                    ? setBetAmount(100)
                    : value > 10000
                    ? setBetAmount(10000)
                    : setBetAmount(value);
                }}
                max={10000}
                step={50}
                placeholder={l[sl].bet_amount}
              />
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "start",
                  justifyContent: "space-between",
                  marginTop: "15px",
                  gap: "15px",
                }}
              >
                <div direction="vertical">
                  <button
                    disabled={betAmount === 10000}
                    onClick={() => handleAdd(100)}
                  >
                    +100
                  </button>
                  <button
                    disabled={betAmount === 10000}
                    onClick={() => handleAdd(500)}
                  >
                    +500
                  </button>
                  <button
                    disabled={betAmount === 10000}
                    onClick={() => handleAdd(1000)}
                  >
                    +1000
                  </button>
                </div>
                <div direction="vertical">
                  <button
                    disabled={betAmount === 100}
                    onClick={() => handleAdd(-100)}
                  >
                    -100
                  </button>
                  <button
                    disabled={betAmount === 100}
                    onClick={() => handleAdd(-500)}
                  >
                    -500
                  </button>
                  <button
                    disabled={betAmount === 100}
                    onClick={() => handleAdd(-1000)}
                  >
                    -1000
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              placeholder="Username"
            />
            <button onClick={handleRegister} disabled={isUsernameTaken}>
              {usernameLoading ? <RiHourglassFill /> : "Register"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
