import { api } from "./api";

export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    registerUser: builder.mutation({
      query: (body) => ({
        url: "/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    loginUser: builder.mutation({
      query: (body) => ({
        url: "/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    checkUsername: builder.mutation({
      query: (body) => ({
        url: "/username/check",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    transferMoney: builder.mutation({
      query: (body) => ({
        url: "/transfer",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useCheckUsernameMutation,
  useTransferMoneyMutation,
} = userApi;
