import {
  useGetFromDeckMutation,
  useGetUserGameQuery,
  useKickPlayerMutation,
  usePlayTurnMutation,
  useRefillDeckMutation,
} from "../context/services/game.service";
import backCard from "../assets/back.png";
import cards from "../constants/cards";
import "swiper/css";
import "swiper/css/effect-cards";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards } from "swiper/modules";
import { useMemo, useState } from "react";
import { GiCardPickup } from "react-icons/gi";
import { FaArrowUpLong, FaCrown } from "react-icons/fa6";
import { notification, Modal } from "antd";
import { l } from "../assets/lang.js";
import spadesImg from "../assets/spades.svg";
import clubsImg from "../assets/clubs.png";
import heartsImg from "../assets/hearts.png";
import diamondsImg from "../assets/diamonds.png";
import { IoMdExit } from "react-icons/io";
import { LuCrown } from "react-icons/lu";

const Ongoing = () => {
  const { data: data = {} } = useGetUserGameQuery();
  const sl = localStorage.getItem("lang") || "ru";
  const activeGame = data.data;
  const userId = localStorage.getItem("user_id");
  const [refillDeck] = useRefillDeckMutation();
  const [selectedSuit, setSelectedSuit] = useState("");
  const [showSuitModal, setShowSuitModal] = useState(false);
  const selfTurn = activeGame.current_turn._id === userId;
  const [kickPlayer] = useKickPlayerMutation();

  const user = useMemo(() => {
    return activeGame.players.find((p) => p.player._id === userId);
  }, [activeGame, userId]);

  const reversedDeck = useMemo(() => {
    return [...(activeGame.discard_pile || [])].reverse();
  }, [activeGame]);

  const [selectedCards, setSelectedCards] = useState([]);
  const [playTurn] = usePlayTurnMutation();
  const [getFromDeck] = useGetFromDeckMutation();

  async function handlePlayTurn(chosenSuit = "") {
    try {
      await playTurn({
        cards: selectedCards,
        suit: chosenSuit || selectedSuit,
      }).unwrap();
      setSelectedCards([]);
      setSelectedSuit("");
      setShowSuitModal(false);
    } catch (err) {
      console.log(err);
      notification.error({
        message: l[sl][err.data.status],
      });
    }
  }
  async function handleGetFromDeck() {
    try {
      await getFromDeck().unwrap();
      setSelectedCards([]);
      setSelectedSuit("");
      setShowSuitModal(false);
    } catch (err) {
      console.log(err);
      notification.error({
        message: l[sl][err.data.status],
      });
    }
  }
  async function handleRefillDeck() {
    if (activeGame.host !== userId) {
      notification.error({ message: l[sl].refill_denied });
      return;
    }
    try {
      await refillDeck().unwrap();
    } catch (err) {
      console.log(err);
      notification.error({
        message: l[sl][err.data.status],
      });
    }
  }

  return (
    <div className="ongoing">
      <div className="others">
        {activeGame.players
          .filter((f) => f.player._id !== userId)
          .map((i) => (
            <div className="other-player" key={i.player._id}>
              <p>@{i.player.username}</p>
              <div className="other_player_cards">
                {i.hand?.length <= 6 ? (
                  i.hand.map((h, idx) => (
                    <img key={idx} src={backCard} alt="" />
                  ))
                ) : (
                  <div className="back_card">
                    <img src={backCard} alt="" />
                    <p>{i.hand?.length}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      <div className="deck">
        <Swiper
          effect={"cards"}
          grabCursor={false}
          modules={[EffectCards]}
          className="mySwiper"
          allowTouchMove={false}
          simulateTouch={false}
          onClick={handleRefillDeck}
        >
          {activeGame.deck.map((c, index) => (
            <SwiperSlide onClick={handleRefillDeck} key={index}>
              <img key={c} src={backCard} />
            </SwiperSlide>
          ))}
        </Swiper>
        <Swiper
          effect={"cards"}
          grabCursor={false}
          modules={[EffectCards]}
          className="mySwiper"
          allowTouchMove={false}
          simulateTouch={false}
        >
          {reversedDeck.map((c, index) => (
            <SwiperSlide key={index}>
              <img
                key={c}
                src={cards.find((f) => f.card_id === c)?.card_image}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="self">
        {activeGame.host === userId && (
          <div
            className="actions"
            style={{ borderLeft: "none", borderRight: "1px solid #fff" }}
          >
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
        )}
        <div className="cards">
          {user.hand.map((h) => (
            <img
              key={h}
              onClick={() => {
                !selectedCards.includes(h)
                  ? setSelectedCards([...selectedCards, h])
                  : setSelectedCards(selectedCards.filter((f) => f !== h));
              }}
              style={
                selectedCards.includes(h)
                  ? { transform: "translateY(-20px)" }
                  : {}
              }
              src={cards.find((f) => f.card_id === h)?.card_image}
              alt=""
            />
          ))}
        </div>

        <div className="actions">
          <p>
            {l[sl].current_turn}: @{activeGame.current_turn.username}{" "}
            {activeGame.current_turn._id === userId && "(You)"}
          </p>
          <p>
            {l[sl].current_suit}: {l[sl][activeGame.current_suit]}
          </p>
          <p>
            <p>
              {l[sl].current_rank}:{" "}
              {activeGame.current_rank?.length > 2
                ? l[sl][activeGame.current_rank]
                : activeGame.current_rank}
            </p>{" "}
          </p>

          <button
            onClick={handleGetFromDeck}
            disabled={!selfTurn || activeGame.discard_pile?.length === 0}
          >
            <GiCardPickup size={20} />
            {l[sl].get_from_deck}
          </button>

          <button
            disabled={!selfTurn || selectedCards?.length === 0}
            onClick={() => {
              const lastCard = selectedCards[selectedCards?.length - 1];
              if (lastCard && lastCard.split("_")[1] === "queen") {
                setShowSuitModal(true);
              } else {
                handlePlayTurn();
              }
            }}
          >
            <FaArrowUpLong />
            {l[sl].turn}
          </button>
        </div>
      </div>

      <Modal
        title={l[sl].choose_suit}
        open={showSuitModal}
        onCancel={() => setShowSuitModal(false)}
        footer={null}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        {/* {["hearts", "spades", "clubs", "diamonds"].map((suit) => (
          <div
            key={suit}
            style={{ margin: "5px" }}
            onClick={() => handlePlayTurn(suit)}
          >
            {suit}
          </div>
        ))} */}
        <img
          src={clubsImg}
          onClick={() => handlePlayTurn("clubs")}
          alt=""
          className="modal-img"
        />
        <img
          src={spadesImg}
          onClick={() => handlePlayTurn("spades")}
          alt=""
          className="modal-img"
        />
        <img
          src={heartsImg}
          onClick={() => handlePlayTurn("hearts")}
          alt=""
          className="modal-img"
        />
        <img
          src={diamondsImg}
          onClick={() => handlePlayTurn("diamonds")}
          alt=""
          className="modal-img"
        />
      </Modal>
    </div>
  );
};

export default Ongoing;
