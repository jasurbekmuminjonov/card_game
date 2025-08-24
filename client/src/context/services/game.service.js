import { api } from "./api";

export const gameApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createGame: builder.mutation({
      query: (body) => ({
        url: "/game/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    joinGame: builder.mutation({
      query: (body) => ({
        url: "/game/join",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    startGame: builder.mutation({
      query: (body) => ({
        url: "/game/start",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    playTurn: builder.mutation({
      query: (body) => ({
        url: "/game/turn",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    getFromDeck: builder.mutation({
      query: (body) => ({
        url: "/game/deck/get",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    refillDeck: builder.mutation({
      query: (body) => ({
        url: "/game/deck/refill",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    kickPlayer: builder.mutation({
      query: (body) => ({
        url: "/game/player/kick",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    exitGame: builder.mutation({
      query: (body) => ({
        url: "/game/exit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    startAnotherRound: builder.mutation({
      query: (body) => ({
        url: "/game/start/another",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),

    getUserGame: builder.query({
      query: () => ({
        url: "/game/get",
        method: "GET",
      }),
      providesTags: ["Game"],
    }),
  }),
});

export const {
  useCreateGameMutation,
  useJoinGameMutation,
  useStartGameMutation,
  usePlayTurnMutation,
  useGetFromDeckMutation,
  useRefillDeckMutation,
  useKickPlayerMutation,
  useExitGameMutation,
  useStartAnotherRoundMutation,
  useGetUserGameQuery,
} = gameApi;
