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

Sign up with your own Toyota. The dashboard puts the Camry on a white ground you can rotate, with trade-in, gas savings, charging, and emissions as tabs. Signing in accepts any password and does not store it.

## Honesty

Every dollar is synthetic example data, not a Toyota Financial Services product, price, or decision. Values are modelled, not sampled from listings. The car on screen is a supplied 2025 Camry model, an illustration, not the vehicle in the scenario. Paint changes the material named CarPaint.
