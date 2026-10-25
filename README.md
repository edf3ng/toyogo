# ToyoGo

## What the project does

ToyoGo helps Toyota owners explore whether to keep their current car or switch to a hybrid, plug-in hybrid, or electric vehicle. It brings ownership costs, driving habits, charging access, and personal priorities into one interactive comparison.

A five-stop signup journey collects account information, ZIP code and home charging access, vehicle details, ownership or financing information, and ranked preferences. The dashboard then presents a recommendation alongside alternatives and the factors that make them more or less practical.

The Summary dashboard includes a rotatable 3D car illustration and two tabs:

### Analytics
Utilizes SerpAPI to gather data on the vehicle that the user specified. Then, through Gemini AI, the data is organized into a summary that can be easily read and understood. This is mainly to calculate the Trade-in value, as well as the market price:
- **Trade-in:** Estimated vehicle value, remaining payoff, equity, and replacement options. An optional market check uses search results interpreted by Gemini to supplement the modelled figures.

### Suggestions
This tab provides the best hybrid/EV alternatives to the current user's vehicle. It will compare several factors, including:
- **Savings:** Estimated fuel and electricity costs, annual savings, and a five-year fuel-savings chart. A daily-mileage slider lets users explore different driving patterns.
- **Charging:** A map of charging locations with an adjustable search radius for plug-in recommendations.
- **Emissions:** A comparison of estimated annual tailpipe CO2 emissions between the current car and the new car.

The main recommendation comes from the calculation engine in `lib/engine`, which weighs cost, fuel savings, emissions, practicality, and performance against the user's ranked preferences.

## How to use it

### Explore the website

1. Select **Sign up** and enter an email, username, and password. Replace any prefilled example values with your own.
2. Complete the five stops: **Your account**, **Where you drive**, **Your Toyota**, **How you paid**, and **What matters**. Rank the preferences that matter most.
3. Select **Start the drive** to save your account and open the dashboard.
4. Explore the evidence tabs and interactive controls to understand the recommendation and its assumptions.
5. Click your username in the top-right corner to open **Summary**, **Customize**, or **Sign out**. Customize restores your saved details; completing it with **Save changes** updates the profile and recalculates the recommendation. Leave the password blank to keep your current password.
6. Log in again with your email and password to retrieve your saved profile.

### Run locally

Install Node.js with npm, open a terminal in the project folder, and run:

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal, usually `http://localhost:3000`. Keep the server running while using the app.

Create `.env.local` using `.env.example` as a reference. The core comparison works without the optional external APIs.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection string for persistent accounts, profiles, and sessions, including Neon on Vercel. |
| `OPENCHARGEMAP_API_KEY` | Enables live charging-station requests. Without it, or if the request fails, the map uses a limited saved Austin sample. |
| `SERPAPI_KEY` and `GEMINI_API_KEY` | Enable the search-based AI market check. If unavailable, the dashboard still shows its modelled estimates. |
| `GEMINI_MODEL` | Optional model selection for Gemini requests. |

With `DATABASE_URL` configured, the app creates its account-storage table automatically. Without it, local development saves accounts to `data/accounts.json`. Passwords are hashed, and login sessions use an HTTP-only cookie. VINs and uploaded agreement contents are not saved.

To import existing JSON accounts into the configured database:

```bash
npm run accounts:import
```

The import preserves passwords and profiles and skips accounts already present. The JSON file is not synchronized with Postgres afterward. Local and deployed sites share accounts when they use the same database.

For Vercel, configure `DATABASE_URL` for Production and deploy the latest code. Local JSON storage is not supported there. Keep connection strings and API keys out of source control; `.env.local` is ignored by Git.

Run `npm test` for automated checks, or `npm run build` followed by `npm start` to run a production build locally.

## Why it matters

Countless factors go into making a replacement car affordable. Loan balances, trade-in equity, financing costs, daily mileage, and access to charging can change whether a switch makes sense. With this many variables, it can get confusing and unnecessarily hard for a customer to decide on a purchase, and as a result people might simply choose not to switch at all.

ToyoGo makes these factors visible in one place. Users can adjust their circumstances, compare the results, and quickly and efficiently see why an option fits or falls short before pursuing a purchase. It also connects the cost of electrification to its practical requirements and potential environmental benefits.

Through this product, potential customers can cut out all the difficult and rigorous computations involved in such a pivotal decision as buying a car. Through directly allowing the user to view the benefits of buying a new hybrid/EV, the website demonstrates to people in a straightforward manner that the purchase of a new car is worth more than maintaining an old one. By focusing on hybrid/EV sales, this website will not only contribute to environmental protection, but also encourages Toyota's push for innovation in the electric car industry.
