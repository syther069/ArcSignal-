-- Supabase Schema for ArcSignal

-- Enums
CREATE TYPE market_category AS ENUM ('football', 'crypto');
CREATE TYPE crypto_subtype AS ENUM ('price', 'listing', 'onchain');

-- User Profiles
CREATE TABLE profiles (
    "walletAddress" text PRIMARY KEY,
    username text NOT NULL,
    bio text,
    "avatarUrl" text,
    "joinedAt" timestamp with time zone DEFAULT now(),
    "winRate" numeric DEFAULT 0,
    "totalStaked" numeric DEFAULT 0,
    "netProfit" numeric DEFAULT 0,
    "marketsEntered" integer DEFAULT 0,
    "currentStreak" integer DEFAULT 0,
    "nftMinted" boolean DEFAULT false
);

-- Markets
CREATE TABLE markets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category market_category NOT NULL,
    "subType" crypto_subtype,
    title text NOT NULL,
    description text NOT NULL,
    "agentPick" text NOT NULL,
    "agentId" text NOT NULL,
    confidence numeric NOT NULL,
    "keyFactors" text[] NOT NULL,
    "followPool" numeric DEFAULT 0,
    "fadePool" numeric DEFAULT 0,
    "resolutionTime" bigint NOT NULL,
    resolved boolean DEFAULT false,
    outcome text,
    league text,
    "homeTeam" text,
    "awayTeam" text,
    "homeScore" integer,
    "awayScore" integer,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- Stakes
CREATE TABLE stakes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "marketId" uuid REFERENCES markets(id),
    "walletAddress" text REFERENCES profiles("walletAddress"),
    side integer NOT NULL, -- 0 for Follow, 1 for Fade
    "amountUsdc" numeric NOT NULL,
    "txHash" text NOT NULL,
    outcome text,
    pnl numeric,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- Resolutions
CREATE TABLE resolutions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "marketId" uuid REFERENCES markets(id),
    "resolvedAt" timestamp with time zone DEFAULT now(),
    outcome text NOT NULL,
    "proofUrl" text
);

-- Leaderboard View
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    "walletAddress",
    username,
    "avatarUrl",
    "totalStaked",
    "winRate",
    "netProfit",
    "marketsEntered"
FROM profiles;
