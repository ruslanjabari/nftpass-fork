import { SiweMessage } from "./../../../frontend/node_modules/siwe/lib/client";
declare module "express-session" {
  interface SessionData {
    siwe: SiweMessage;
    nonce: string;
    ens: string;
  }
}
