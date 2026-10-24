# NextMove

A four-step look at the Toyota someone already has: what it is worth, what it costs to drive, and one next move. The numbers come from the engine in `lib/engine`. A language model, when configured, only restates those numbers.

## Run

```bash
npm install
npm run dev
npm test
```

`npm run fetch-epa` refreshes `data/epa-cache.json` from FuelEconomy.gov. The app tries the live API for three seconds, then uses that file.

## Demo

Open the app on Elena (2023 Corolla, lease ending). Walk the four stops. On the last stop, switch “What matters most” to lowest emissions — the recommendation becomes the Prius Prime and shows a break-even. Switch the scenario to Income dip for the one-month extension. The one-page summary is in this browser tab only.

The For Toyota page counts those three scenarios. It is labelled simulated.

## Honesty

Every dollar is synthetic example data, not a Toyota Financial Services product or decision. Values are modelled, not sampled from listings. The car on screen is the supplied low-poly Corolla E80 (`source/Corolla.blend`, exported to `public/models/corolla.glb`). The archive did not include a licence. It is labelled a stylised illustration because an E80 is not the modern car in the scenario. Paint changes the material named `gray` on the body object only. Red on this model is a small lamp, and the gray on the wheels is the rim.
