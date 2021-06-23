
// We create a class because we want to different an error from another.
export class AuthTokenError extends Error {
  constructor(){
    super('Error with authentication token.')
  }
}