import dotenv from "dotenv";
import { generateJwt } from "@coinbase/cdp-sdk/auth";

// explizit .env.local laden
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("ENV:", process.env.COINBASE_API_KEY_NAME, process.env.COINBASE_API_KEY_SECRET); // debug

  const apiKeyId = process.env.COINBASE_API_KEY_NAME;
  const apiKeySecret = process.env.COINBASE_API_KEY_SECRET;

  if (!apiKeyId || !apiKeySecret) {
    console.error("Bitte COINBASE_API_KEY_NAME und COINBASE_API_KEY_SECRET in .env.local setzen");
    process.exit(1);
  }

  const jwt = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: "GET",
    requestHost: "api.coinbase.com",
    requestPath: "/v2/accounts",
  });

  console.log(jwt);
}

main();
