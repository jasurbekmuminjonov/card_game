const User = require("../models/user.model");
const Game = require("../models/game.model");
const generateCode = require("../helpers/generateCode");
const allCards = require("../cards.json");
const shuffle = require("../helpers/shuffle");
const mongoose = require("mongoose");
const { sendGameToPlayers } = require("../helpers/socketHelper");

exports.createGame = async (req, res) => {
  try {
    const { user_id } = req.headers;
    const code = generateCode(6);
    const { card_count, bet_amount } = req.body;

    const filteredCards = allCards.filter((card) => {
      const lastChar = card.slice(-1);
      return !["2", "3", "4", "5"].includes(lastChar);
    });

    const shuffledCards = shuffle(filteredCards);

    const oldGame = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: { $ne: "finished" },
    });
    if (oldGame) {
      return res.status(400).json({ status: "already_in_game" });
    }

    await Game.create({
      host: user_id,
      game_code: code,
      players: [
        {
          player: user_id,
          hand: [],
        },
      ],
      settings: {
        card_count,
        bet_amount,
      },
      deck: shuffledCards,
    });
    res.status(201).json({ status: "success" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.joinGame = async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { game_code } = req.body;
    const game = await Game.findOne({
      game_code,
      status: { $in: ["lobby", "waiting_next_round"] },
    });
    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }
    const oldGame = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: { $ne: "finished" },
    });
    if (oldGame) {
      return res.status(400).json({ status: "already_in_game" });
    }
    game.players.push({
      player: user_id,
      hand: [],
    });
    await game.save();
    sendGameToPlayers(req, game.players);
    res.status(200).json({ status: "success" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.startGame = async (req, res) => {
  try {
    const { user_id } = req.headers;
    console.log(user_id);

    const game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: "lobby",
    });
    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }
    if (game.host.toString() !== user_id) {
      return res.status(400).json({ status: "access_denied" });
    }
    const players = game.players.map(
      (p) => new mongoose.Types.ObjectId(p.player)
    );
    const users = await User.find({ _id: { $in: players } });
    const betAmount = game.settings.bet_amount;
    const poorUser = users.find((u) => u.balance < betAmount);
    if (poorUser) {
      return res
        .status(400)
        .json({ status: "insufficient_funds", data: poorUser });
    }
    const cardCount = game.settings.card_count;
    const deckCopy = [...game.deck];

    game.players.forEach((p) => (p.hand = []));

    while (
      game.players.some((p) => p.hand.length < cardCount) &&
      deckCopy.length > 0
    ) {
      for (let i = 0; i < game.players.length; i++) {
        if (game.players[i].hand.length < cardCount) {
          const card = deckCopy.shift();
          game.players[i].hand.push(card);
        }
      }
    }

    game.deck = deckCopy;
    game.current_turn = game.host;
    game.status = "ongoing";
    game.round = 1;

    await game.save();
    sendGameToPlayers(req, game.players);
    res.status(200).json({ message: "game_started" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.playTurn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { user_id } = req.headers;
    const { cards, suit: newSuit } = req.body; // req.body.suit faqat ace uchun keladi

    const game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: "ongoing",
    });
    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }

    if (game.current_turn.toString() !== user_id) {
      return res.status(400).json({ status: "access_denied" });
    }

    const player = game.players.find((p) => p.player?.toString() === user_id);
    if (!player) {
      return res.status(404).json({ status: "player_not_found" });
    }

    if (cards.length > 1) {
      for (let i = 0; i < cards.length; i++) {
        const [suit, rank] = cards[i].split("_");

        if (i === 0) {
          // Birinchi karta rank 8 bo'lmasa va bir nechta karta → xato
          if (rank !== "8") {
            return res.status(400).json({
              status: "card_selection_error",
            });
          }
        } else {
          const [prevSuit, prevRank] = cards[i - 1].split("_");

          if (prevRank === "8") {
            // Oldingi karta rank 8 bo'lsa: keyingi karta rank 8 yoki oldingi suit bilan mos bo'lishi kerak
            if (rank !== "8" && rank !== "queen" && suit !== prevSuit) {
              return res.status(400).json({
                status: "card_selection_error",
              });
            }
          } else {
            // Oldingi karta rank 8 bo'lmasa, boshqa karta tashlash mumkin emas
            return res.status(400).json({
              status: "card_selection_error",
            });
          }
        }
      }
    }

    // Current rank 6 yoki 7 bo'lsa, faqat shu rankdagi kartalarni tashlash mumkin
    if (
      !game.current_suit &&
      (game.current_rank === "6" || game.current_rank === "7")
    ) {
      const valid = cards.every((c) => c.endsWith(`_${game.current_rank}`));
      if (!valid) {
        return res.status(400).json({
          status: "card_selection_error",
          data: { current_rank: game.current_rank },
        });
      }
    } else if (game.current_rank === null && game.current_suit) {
      // Queen effekti: faqat current_suit ga mos keladigan kartalarni cheklash, boshqa queenlar tashlanishi mumkin
      const firstCard = cards[0];
      const [firstSuit, firstRank] = firstCard.split("_");

      // Agar bu queen bo'lsa, ruxsat beramiz
      if (firstRank !== "queen" && firstSuit !== game.current_suit) {
        return res.status(400).json({
          status: "card_selection_error",
          data: { current_suit: game.current_suit },
        });
      }
    } else if (game.current_suit == null && game.current_rank == null) {
      // birinchi yurish - hech qanday cheklov yo'q
      // hech narsa qaytarmaymiz
    } else {
      // Odatiy holat: first card current_suit yoki current_rank ga mos bo'lishi kerak
      const firstCard = cards[0];
      const [firstSuit, firstRank] = firstCard.split("_");
      if (firstRank === "queen") {
        // Hech qanday xato qaytarmaymiz
      } else {
        if (
          firstSuit !== game.current_suit &&
          firstRank !== game.current_rank
        ) {
          return res.status(400).json({
            status: "card_selection_error",
          });
        }
      }
    }

    // Player hand'dan tashlangan kartalarni olib tashlash
    player.hand = player.hand.filter((c) => !cards.includes(c));

    // Discard pile ga qo'shish
    game.discard_pile.push(...cards);

    // Oxirgi karta orqali current_rank va current_suit yangilash
    const lastCard = cards[cards.length - 1];
    let [lastSuit, lastRank] = lastCard.split("_");

    if (lastRank) {
      if (lastRank === "7" || lastRank === "6") {
        if (
          game.stacking.length > 0 &&
          game.stacking[game.stacking.length - 1] === lastRank
        ) {
          game.stacking.push(lastRank);
        } else {
          game.stacking = [lastRank];
        }
      } else {
        game.stacking = [];
      }
    }

    // Rank 6 yoki 7 special holat
    if (game.current_suit && (lastRank === "6" || lastRank === "7")) {
      game.current_rank = lastRank;
      game.current_suit = null;
    } else if (lastRank === "queen") {
      // Queen special
      game.current_suit = newSuit;
      game.current_rank = null;
    } else {
      // Oddiy karta
      game.current_suit = lastSuit;
      game.current_rank = lastRank;
    }

    // Turnni keyingi o'yinchiga o'tkazish
    const currentIndex = game.players.findIndex(
      (p) => p.player?.toString() === user_id
    );
    let nextIndex = currentIndex;

    do {
      if (lastRank === "8") {
        // rank 8 bo'lsa turn o'yinchida qoladi
        nextIndex = currentIndex;
        break;
      } else if (lastRank === "ace") {
        nextIndex = (nextIndex + 2) % game.players.length;
      } else {
        nextIndex = (nextIndex + 1) % game.players.length;
      }
    } while (
      game.players[nextIndex].hand.length === 0 &&
      nextIndex !== currentIndex
    );

    game.current_turn = game.players[nextIndex].player;

    const activePlayers = game.players.filter((p) => p.hand.length > 0);
    const winners = game.players.filter((p) => p.hand.length === 0);

    if (activePlayers.length === 1) {
      const loserPlayerId = activePlayers[0].player;
      game.losers.push(loserPlayerId);

      // Loser balansini kamaytirish
      await User.findByIdAndUpdate(
        loserPlayerId,
        {
          $inc: { balance: -game.settings.bet_amount },
        },
        { session }
      );

      // G'oliblar soni
      const rewardAmount = game.settings.bet_amount / winners.length;

      // Har bir winner balansini oshirish va username olish
      const players = [];

      for (const winner of winners) {
        const user = await User.findByIdAndUpdate(
          winner.player,
          {
            $inc: { balance: rewardAmount },
          },
          { new: true, session }
        );

        players.push({
          player_username: user.username,
          player_id: user._id,
          round_status: "winner",
          reward: rewardAmount,
        });
      }

      // Loser info
      const loserUser = await User.findById(loserPlayerId);
      players.push({
        player_username: loserUser.username,
        player_id: loserUser._id,
        round_status: "loser",
        reward: -game.settings.bet_amount,
      });

      // Round tugadi deb belgilash
      const filteredCards = allCards.filter((card) => {
        const lastChar = card.slice(-1);
        return !["2", "3", "4", "5"].includes(lastChar);
      });

      const shuffledCards = shuffle(filteredCards);
      game.deck = shuffledCards;
      game.round = game.round + 1;
      game.discard_pile = [];
      game.stacking = [];
      game.current_turn = null;
      game.current_rank = null;
      game.current_suit = null;
      game.status = "lobby";
      await game.save({ session });
      await session.commitTransaction();
      sendGameToPlayers(req, game.players);

      return res.status(200).json({ status: "round_ended", data: players });
    }

    await game.save({ session });
    await session.commitTransaction();
    sendGameToPlayers(req, game.players);

    return res.status(200).json({ status: "success" });
  } catch (err) {
    await session.abortTransaction();
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  } finally {
    session.endSession();
  }
};

exports.getFromDeck = async (req, res) => {
  try {
    const { user_id } = req.headers;

    const game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: "ongoing",
    });
    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }

    if (game.current_turn.toString() !== user_id) {
      return res.status(400).json({ status: "access_denied" });
    }

    const player = game.players.find((p) => p.player?.toString() === user_id);
    if (!player) {
      return res.status(404).json({ status: "player_not_found" });
    }

    // Stack bo'yicha qancha karta olish kerakligini aniqlash
    let cardsToDraw = 1; // default
    if (game.stacking.length > 0) {
      const firstRank = game.stacking[0];
      if (firstRank === "6") cardsToDraw = game.stacking.length * 1;
      if (firstRank === "7") cardsToDraw = game.stacking.length * 2;
    }

    // Deck bo'shligini tekshirish
    if (game.deck.length === 0) {
      return res.status(400).json({ status: "deck_empty" });
    }

    // Deckdan kerakli miqdorda karta olish
    const drawnCards = [];
    for (let i = 0; i < cardsToDraw; i++) {
      if (game.deck.length === 0) break;
      const card = game.deck.shift();
      drawnCards.push(card);
      player.hand.push(card);
    }
    const lastDiscard = game.discard_pile[game.discard_pile.length - 1];
    const [lastSuit, lastRank] = lastDiscard.split("_");
    // if (game.stacking.length > 0) {
    if (game.current_suit) {
      game.current_rank = lastRank;
      game.current_suit = lastSuit;
    }
    // }

    // Stack reset qilinadi
    game.stacking = [];

    // Turnni keyingi o'yinchiga o'tkazish
    const currentIndex = game.players.findIndex(
      (p) => p.player?.toString() === user_id
    );

    let nextIndex = currentIndex;

    do {
      nextIndex = (nextIndex + 1) % game.players.length;
    } while (
      game.players[nextIndex].hand.length === 0 &&
      nextIndex !== currentIndex
    );

    game.current_turn = game.players[nextIndex].player;

    await game.save();
    sendGameToPlayers(req, game.players);

    return res.status(200).json({
      status: "success",
      drawnCards,
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.refillDeck = async (req, res) => {
  const { user_id } = req.headers;

  try {
    const game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: "ongoing",
    });

    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }

    if (game.host.toString() !== user_id) {
      return res.status(400).json({ status: "access_denied" });
    }

    if (!game.discard_pile || game.discard_pile.length <= 1) {
      return res.status(400).json({ status: "not_enough_cards_in_discard" });
    }

    // Oxirgi kartani saqlash
    const lastCard = game.discard_pile[game.discard_pile.length - 1];

    // Qolgan kartalarni shuffle qilish
    const cardsToShuffle = game.discard_pile.slice(0, -1);
    const shuffledCards = shuffle(cardsToShuffle);

    // Shuffle qilingan kartalarni deck oxiriga qo'shish
    game.deck = [...game.deck, ...shuffledCards];

    // discard pile faqat oxirgi kartani saqlaydi
    game.discard_pile = [lastCard];

    await game.save();
    sendGameToPlayers(req, game.players);

    return res.status(200).json({ status: "deck_refilled" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.kickPlayer = async (req, res) => {
  try {
    const { player_id } = req.body;
    const { user_id } = req.headers;

    const game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: { $in: ["lobby", "waiting_next_round", "ongoing"] },
    });

    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }

    if (game.host.toString() !== user_id) {
      return res.status(400).json({ status: "access_denied" });
    }

    const playerIndex = game.players.findIndex(
      (p) => p.player.toString() === player_id
    );

    if (playerIndex === -1) {
      return res.status(404).json({ status: "player_not_found" });
    }

    const kickedPlayer = game.players[playerIndex];

    // Agar kick qilinayotgan o'yinchi current_turn da bo'lsa, navbatni keyingi o'yinchiga o'tkazish
    if (game.status === "ongoing") {
      if (game.current_turn.toString() === player_id) {
        let nextIndex = playerIndex;

        do {
          nextIndex = (nextIndex + 1) % game.players.length;
        } while (
          game.players[nextIndex].hand.length === 0 &&
          nextIndex !== playerIndex
        );

        game.current_turn = game.players[nextIndex].player;
      }

      // Kick qilingan o'yinchining handidagi kartalarni deck oxiriga qo'shish
      game.deck.push(...kickedPlayer.hand);
    }

    // O'yinchini players arrayidan o'chirish
    game.players.splice(playerIndex, 1);

    await game.save();
    sendGameToPlayers(req, game.players);

    return res.status(200).json({ status: "success" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.exitGame = async (req, res) => {
  try {
    const { user_id } = req.headers;

    const game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: { $in: ["lobby", "waiting_next_round", "ongoing"] },
    });

    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }

    const playerIndex = game.players.findIndex(
      (p) => p.player.toString() === user_id
    );

    if (playerIndex === -1) {
      return res.status(404).json({ status: "player_not_found" });
    }

    const exitingPlayer = game.players[playerIndex];
    if (game.status === "ongoing") {
      // Agar exit qilayotgan o'yinchi current_turn da bo'lsa, navbatni keyingi o'yinchiga o'tkazish
      if (game.current_turn.toString() === user_id) {
        let nextIndex = playerIndex;

        do {
          nextIndex = (nextIndex + 1) % game.players.length;
        } while (
          game.players[nextIndex].hand.length === 0 &&
          nextIndex !== playerIndex
        );

        game.current_turn = game.players[nextIndex].player;
      }

      // Exit qilayotgan o'yinchining handidagi kartalarni deck oxiriga qo'shish
      game.deck.push(...exitingPlayer.hand);
    }

    // O'yinchini players arrayidan o'chirish
    game.players.splice(playerIndex, 1);

    // Agar exit qilayotgan o'yinchi host bo'lsa, yangi host tayinlash
    if (game.host.toString() === user_id && game.players.length > 0) {
      game.host = game.players[0].player;
    }

    await game.save();
    sendGameToPlayers(req, game.players);

    return res.status(200).json({ status: "success" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.startAnotherRound = async (req, res) => {
  try {
    const { user_id } = req.headers;
    const game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: "waiting_next_round",
    });
    if (!game) {
      return res.status(404).json({ status: "game_not_found" });
    }

    if (game.host.toString() !== user_id) {
      return res.status(400).json({ status: "access_denied" });
    }
    const filteredCards = allCards.filter((card) => {
      const lastChar = card.slice(-1);
      return !["2", "3", "4", "5"].includes(lastChar);
    });

    const shuffledCards = shuffle(filteredCards);
    game.deck = shuffledCards;
    game.round = game.round + 1;
    game.discard_pile = [];
    game.stacking = [];
    game.current_turn = null;
    game.current_rank = null;
    game.current_suit = null;
    game.status = "lobby";

    await game.save();
    res.status(200).json({ status: "success" });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ status: "server_error", data: err });
  }
};

exports.getUserGame = async (req, res) => {
  try {
    const { user_id } = req.headers;
    let game = await Game.findOne({
      "players.player": new mongoose.Types.ObjectId(user_id),
      status: { $ne: "finished" },
    })
      .populate("players.player")
      .populate("current_turn")
      .lean();

    if (!game) {
      return res.json({ status: "game_not_found" });
    }

    const otherPlayers = game.players.filter(
      (p) => p.player?._id.toString() !== user_id
    );

    otherPlayers.forEach((p) => {
      if (Array.isArray(p.hand)) {
        p.hand = p.hand.map(() => "😭"); 
      }
    });

    return res.json({ status: "game_found", data: game });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: "Serverda xatolik", err });
  }
};

