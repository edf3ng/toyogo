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

Open the verdict and switch Alex, Blair, and Casey. Alex gets a viable bZ4X, Blair a plug-in that covers about 76% of the day, and Casey a standard hybrid because charging is not available. Signing in accepts any password and does not store it.

## Honesty

Every dollar is synthetic example data, not a Toyota Financial Services product, price, or decision. Values are modelled, not sampled from listings. The car on screen is a stylised illustration, not the vehicle in the scenario.
