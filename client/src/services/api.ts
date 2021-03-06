import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";
import { AuthTokenError } from "./errors/AuthTokenError";

let isRefreshing = false;
let failedRequestQueue = [];

// This code work in both sides client and server.
export function setupAPIClient(ctx = undefined) {

  // We send the cookies (token) always from all pages
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies["nextauth.token"]}`,
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response.status === 401) {
        if (error.response.data?.code === "token.expired") {
          // Get the current cookies
          cookies = parseCookies(ctx);

          const { "nextauth.refreshToken": refreshToken } = cookies;
          const originalConfig = error.config; // this contain all the request information's

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post("refresh", { refreshToken })
              .then((response) => {
                const { token } = response.data;

                // Update cookies with the new token
                setCookie(ctx, "nextauth.token", token, {
                  maxAge: 60 * 60 * 24 * 30,
                  path: "/",
                });

                setCookie(
                  ctx,
                  "nextauth.refreshToken",
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30,
                    path: "/",
                  }
                );

                api.defaults.headers["Authorization"] = `Bearer ${token}`;

                // If the refresh token is success we call the queue of request
                // and pass the new token  for each one of them
                failedRequestQueue.forEach((request) => {
                  request.onSuccess(token);
                });
                // and them clean the queue
                failedRequestQueue = [];
                //-------------------------------
              })
              .catch((error) => {
                failedRequestQueue.forEach((request) => {
                  request.onFailure(error);
                });
                failedRequestQueue = [];

                if (process.browser) {
                  signOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          // return queue of request
          // We need to return a Promise because interceptors don't accept async/await
          return new Promise((resolve, reject) => {
            failedRequestQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers["Authorization"] = `Bearer ${token}`;
                // Wait for api to finish
                resolve(api(originalConfig));
              }, // refresh token done with success
              onFailure: (error: AxiosError) => {
                reject(error);
              }, // refresh token fail
            });
          });
          //------------------------------
        } else {
          if (process.browser) {
            signOut();
          } else{
            return Promise.reject(new AuthTokenError())
          }

        }
      }

      return Promise.reject(error);
    }
  );
  return api;
}

/* 
This code only work in the client side

export const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies["nextauth.token"]}`,
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response.status === 401) {
        if (error.response.data?.code === "token.expired") {
          // Get the current cookies
          cookies = parseCookies();

          const { "nextauth.refreshToken": refreshToken } = cookies;
          const originalConfig = error.config; // this contain all the request information's

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post("refresh", { refreshToken })
              .then((response) => {
                const { token } = response.data;

                // Update cookies with the new token
                setCookie(undefined, "nextauth.token", token, {
                  maxAge: 60 * 60 * 24 * 30,
                  path: "/",
                });

                setCookie(
                  undefined,
                  "nextauth.refreshToken",
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30,
                    path: "/",
                  }
                );

                api.defaults.headers["Authorization"] = `Bearer ${token}`;

                // If the refresh token is success we call the queue of request
                // and pass the new token  for each one of them
                failedRequestQueue.forEach((request) => {
                  request.onSuccess(token);
                });
                // and them clean the queue
                failedRequestQueue = [];
                //-------------------------------
              })
              .catch((error) => {
                failedRequestQueue.forEach((request) => {
                  request.onFailure(error);
                });
                failedRequestQueue = [];

                if (process.browser) {
                  signOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          // return queue of request
          // We need to return a Promise because interceptors don't accept async/await
          return new Promise((resolve, reject) => {
            failedRequestQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers["Authorization"] = `Bearer ${token}`;
                // Wait for api to finish
                resolve(api(originalConfig));
              }, // refresh token done with success
              onFailure: (error: AxiosError) => {
                reject(error);
              }, // refresh token fail
            });
          });
          //------------------------------
        } else {
          if (process.browser) {
            signOut();
          }
        }
      }

*/
