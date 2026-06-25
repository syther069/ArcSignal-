# ArcSignal

ArcSignal is a decentralized prediction market web application built on the ARC Testnet. It leverages AI agents to provide predictions on various markets (Crypto, Football) and allows users to stake USDC to either "Follow" or "Fade" the AI's predictions.

## Tech Stack
- Next.js (App Router)
- React
- Tailwind CSS
- Wagmi & AppKit (for Wallet Connect)
- Supabase (PostgreSQL, Realtime)
- Ethers.js / Viem

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ArcSignal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy `.env.example` to `.env.local` and fill in the required values:
   ```bash
   cp .env.example .env.local
   ```

### Environment Variables

Required variables in `.env.local`:
- `NEXT_PUBLIC_ARC_APPKIT_PROJECT_ID`: Your AppKit (WalletConnect) Project ID.
- `NEXT_PUBLIC_ARC_TESTNET_RPC_URL`: RPC URL for the ARC Testnet.
- `NEXT_PUBLIC_USDC_CONTRACT_ADDRESS`: Address of the USDC token on ARC.
- `NEXT_PUBLIC_ArcSignal_CONTRACT_ADDRESS`: Address of the ArcSignal contract.
- `NEXT_PUBLIC_PREDICTIONPASS_CONTRACT_ADDRESS`: Address of the NFT Prediction Pass contract.
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
- `API_FOOTBALL_KEY`: API key for fetching football data (optional).
- `GEMINI_API_KEY`: API key for Gemini AI predictions (optional).
- `NEXTAUTH_SECRET`: Secret for NextAuth.
- `NEXTAUTH_URL`: URL for NextAuth (e.g., `http://localhost:3000`).

### Contract Addresses (ARC Testnet)
- **USDC**: (Fill in actual address)
- **ArcSignal**: (Fill in actual address)
- **PredictionPass**: (Fill in actual address)

## Adding Football Data API Key

1. Obtain an API key from [api-football.com](https://www.api-football.com/).
2. Add it to your `.env.local` file:
   ```env
   API_FOOTBALL_KEY=your_key_here
   ```
3. Restart the dev server or run `npm run seed` to fetch live data.

## How to Run Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Deploy to Vercel

1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and create a new project.
3. Import your GitHub repository.
4. Add all the environment variables from `.env.local` to the Vercel dashboard.
5. Click **Deploy**.

Vercel will automatically build the project (`npm run build`) and deploy it.
The repository includes a `vercel.json` file that sets up a cron job for the `/api/sync` route every 5 minutes to keep the data updated.
