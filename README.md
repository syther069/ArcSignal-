# ArcSignal

## Overview
ArcSignal is the AI-Driven Decentralized Prediction Market built on the ARC Network. It merges artificial intelligence with decentralized finance, deploying sophisticated AI agents to analyze data across Crypto and Sports, and issuing a baseline prediction for the crowd to trade against.

## Screenshots

### Homepage
![Homepage](.<img width="1877" height="800" alt="image" src="https://github.com/user-attachments/assets/09a200e5-00a5-4975-b5ff-04bcb8f0ed47"/>)


### Markets
![Markets](.<img width="1902" height="821" alt="image" src="https://github.com/user-attachments/assets/9a8a4671-c1d5-4a69-a28e-874c68597fc0" />)

### Profile
![Profile](.<img width="1902" height="802" alt="image" src="https://github.com/user-attachments/assets/95de7c84-fd77-4436-a2d3-712db30bc365" />)

## What it does
Instead of users creating arbitrary markets and waiting for a counterparty, ArcSignal deploys AI agents (powered by Google Gemini) to generate data-backed predictions (e.g., "Will BTC break $65k today?"). Participants interact with a streamlined pari-mutuel smart contract, staking USDC to either **"Follow"** (agree) or **"Fade"** (disagree) the AI's signal. This creates a highly liquid, gamified, and frictionless ecosystem testing human intuition against machine intelligence.

## Core features

### AI-Initiated Markets
No more "blank canvas" problems. The AI acts as the house thesis, analyzing real-time data to automatically generate markets and predictions.

### Follow vs Fade Mechanics
A simple, intuitive binary choice. Stake USDC to agree (Follow) or disagree (Fade) with the AI's prediction.

### Pari-Mutuel Settlement
Odds are dynamic and determined by the ratio of capital in the Follow and Fade pools. The losing pool's capital is distributed pro-rata to the winning pool.

### Prediction Pass
Holders of the ERC-721 Prediction Pass unlock deep AI rationale, early market access, and platform fee reductions.

### Stablecoin Settlement
All markets are denominated and settled in USDC, eliminating native-token volatility risk during the prediction lifecycle.

## Supported chains
- **ARC Testnet** (Currently Deployed)
- **ARC Mainnet** (Planned)

## Tech stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Web3 Integration:** Wagmi, AppKit (WalletConnect), Viem
- **Smart Contracts:** Solidity
- **Backend & Data:** Supabase (PostgreSQL, Realtime)
- **AI & Oracles:** Gemini API, API-Football

## Project structure
```text
ArcSignal/
├── src/
│   ├── app/             # Next.js App Router pages and API routes
│   │   ├── api/         # Cron jobs and API endpoints
│   │   ├── dashboard/   # User dashboard
│   │   ├── markets/     # Active prediction markets
│   │   └── ...
│   ├── components/      # Reusable React components
│   ├── lib/             # Utilities, Web3 config, and API integrations
│   └── styles/          # Global CSS
├── contracts/           # Solidity smart contracts
└── public/              # Static assets and images
```

## Local development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ArcSignal.git
   cd ArcSignal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env.local` and configure your API keys (AppKit, RPC URL, Supabase, Gemini, etc.).
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build verification
To verify that the project builds correctly for production:
```bash
npm run build
```
This will compile the Next.js application and report any type errors or missing dependencies.

## Current status
ArcSignal is currently live on the **ARC Testnet**. We are actively testing AI market generation, smart contract settlement, and overall platform stability before progressing to Mainnet.

## Roadmap

### Phase 1: ARC Testnet Launch
- Deployment of core Follow/Fade smart contracts.
- Integration of Gemini AI for Crypto market predictions.
- Integration of Football APIs for sports predictions.
- Community testing and UI/UX refinement.

### Phase 2: Mainnet & Decentralized Oracles
- Deployment on ARC Mainnet.
- Transitioning market resolution to a decentralized oracle network.
- Launch of the Prediction Pass NFT mint.

### Phase 3: Agentic Expansion
- Introduction of specialized AI agents (e.g., DeFi Agent, Macro Agent).
- User-generated markets with AI-assisted odds framing.

## Security notes
- **Unaudited Contracts:** The smart contracts (`ARCSignal.sol`) are currently unaudited. Do not use real funds.
- **API Keys:** Never commit your `.env.local` file containing private keys or API secrets.

## Author
Built by the ArcSignal Team.
