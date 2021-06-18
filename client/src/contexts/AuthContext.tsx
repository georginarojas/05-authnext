import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/api";
import Router from "next/router";
import { setCookie, parseCookies, destroyCookie } from "nookies";

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SignInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user: User;
};

type AuthProviderProps = {
  children: ReactNode;
};

export function signOut() {
  destroyCookie(undefined, "nextauth.token");
  destroyCookie(undefined, "nextauth.refreshToken");
  Router.push("/");
}

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();
  const isAuthenticated = !!user;

  /* ---- GET DATA USER ----- */
  // For to load or reload the page to search the data user, using the cookie.
  useEffect(() => {
    console.log("COOKIES");
    const { "nextauth.token": token } = parseCookies();

    if (token) {
      api
        .get("/me")
        .then((response) => {
          const { email, permissions, roles } = response.data;

          setUser({ email, permissions, roles });
        })
        .catch(() => {
          // if the error is different to token.expired
          signOut();
        });
    }
  }, []);

  /* ---- AUTHORIZATION  ----- */
  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;

      setUser({ email, permissions, roles });

      /* Saving data:
        sessionStorage: only save during a session, if the user closes the 
                        navigator the data are removed
        localStorage: don't work very well with nextjs
        cookies: is possible to save the save for both side, client and server.      
      */

      // https://openbase.com/js/nookies/documentation
      setCookie(
        undefined, // because in this case the cookies are client-side
        "nextauth.token", // name of cookie
        token, // value of cookie
        {
          maxAge: 60 * 60 * 24 * 30, // 30 days (maximum of time that cookie is saved in the navigator)
          path: "/", // Indicates the routes with access to this cookie, '/' is all the routes
        }
      );

      setCookie(undefined, "nextauth.refreshToken", refreshToken, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      //----------------------------------------------------------------

      // Before to redirect the page we need to define the headers
      api.defaults.headers["Authorization"] = `Bearer ${token}`;

      Router.push("/dashboard");
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}
