import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";
import { destroyCookie, parseCookies } from "nookies";
import { AuthTokenError } from "../services/errors/AuthTokenError";
import decode from "jwt-decode";
import { type } from "os";
import { validateUserPermissions } from "./validateUserPermissions";

type WithSSRAuthOptions = {
  permissions?: string[];
  roles?: string[];
};

/* This function allows to access of users not logged 
    in the pages that using this function
*/
/* WithSSRGuest receive another function how parameter (High order function), 
   this first parameter is a function that search token information.
   The second parameter treated about the user permissions and roles.

   withSSRAuth((fn token information), (fn permissions and roles))
*/

export function withSSRAuth<P>(
  fn: GetServerSideProps<P>,
  options?: WithSSRAuthOptions
) {
  /* 1. We need to return a function because the getServerSideProps wait for a function. */

  /* 2. Promise<GetServerSidePropsResult<P>>, is used for typing the return, for 
        this we use GetServerSidePropsResult<P> where <P> is the type of output 
        defined in the withSSRGuest function, call from getServerSideProps function.
        In case of <P> empty, is treated by GetServerSideProps.
  */
  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx); // because is server side.
    const token = cookies["nextauth.token"];

    if (!token) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    // ---- VALIDATE THE PERMISSIONS ----
    if (options) {
      // Only typing the parameters that we use (permissions and roles from token)
      const user = decode<{ permissions: string[]; roles: string[] }>(token);
      const { permissions, roles } = options;

      const userHasValidPermissions = validateUserPermissions({
        user,
        permissions,
        roles,
      });

      if (!userHasValidPermissions) {
        return {
          // send the user for some page where all the users can access
          // if there aren't this page so, we send a error with "notFound: true"
          redirect: {
            destination: "/dashboard",
            permanent: false,
          },
        };
      }
    }
    // -------------------------------------------------------------

    try {
      // if cookies empty, return the original function
      return await fn(ctx);
    } catch (error) {
      if (error instanceof AuthTokenError) {
        console.log(error instanceof AuthTokenError); // true if error is type of AuthTokenError
        destroyCookie(ctx, "nextauth.token");
        destroyCookie(ctx, "nextauth.refreshToken");

        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }
    }
  };
}
