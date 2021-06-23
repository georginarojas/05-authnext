import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";
import { parseCookies } from "nookies";

/* This function allows to access of users not logged 
    in the pages that using this function
*/
// WithSSRGuest receive another function how parameter (High order function)

export function withSSRGuest<P>(fn: GetServerSideProps<P>) {
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

    if (cookies["nextauth.token"]) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

    // if cookies empty, return the original function
    return await fn(ctx);
  };
}
