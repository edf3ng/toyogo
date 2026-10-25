# ToyoGo

Should this Toyota switch to a hybrid or an EV? The engine in `lib/engine` computes the verdict. A language model, when configured, only restates those numbers.

## Run

```bash
npm install
npm run dev
npm test
```

`npm run fetch-epa` refreshes `data/epa-cache.json` from FuelEconomy.gov. The app tries the live API for three seconds, then uses that file.

## Demo

Sign up with your own Toyota. The dashboard puts the Camry on a white ground you can rotate, with trade-in, gas savings, charging, and emissions as tabs.

Completing signup creates an account and saves its profile in `data/accounts.json` (created automatically and ignored by Git). Log in with the signup email and password to retrieve that account's car and preferences. Customize updates the saved profile; leave the password blank to keep it, or enter a new one to change it. Signing out ends the session without deleting the account. Existing browser-only demo profiles are not accounts: complete signup once to create one.

Passwords are stored as salted scrypt hashes. Login sessions use an HTTP-only cookie and last seven days. The JSON store supports one running server process with a writable, persistent filesystem; it is intended for local demos, not multiple server instances or hosting with an ephemeral filesystem. VINs and uploaded agreement contents are not saved.

## Honesty

Every dollar is synthetic example data, not a Toyota Financial Services product, price, or decision. Values are modelled, not sampled from listings. The car on screen is a supplied 2025 Camry model, an illustration, not the vehicle in the scenario. Paint changes the material named CarPaint.
