import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({
  // baseUrl: "http://localhost:8080/api/v1",
  baseUrl: "https://apicardgame.balerion.uz/api/v1",
  prepareHeaders: (headers) => {
    const userId = localStorage.getItem("user_id");

    if (userId) {
      headers.set("user_id", userId);
    }

    headers.set("Cache-Control", "no-cache");
    return headers;
  },
});

const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    localStorage.removeItem("user_id");
  }

  return result;
};

const baseQueryWithRetry = retry(baseQuery, { maxRetries: 1 });

export const api = createApi({
  reducerPath: "splitApi",
  baseQuery: baseQueryWithRetry,
  tagTypes: [],
  endpoints: () => ({}),
});
