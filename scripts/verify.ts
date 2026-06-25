/**
 * ARCSIGNAL END-TO-END VERIFICATION SCRIPT
 * ==========================================
 * Run: npm run verify
 *
 * Tests the full pipeline:
 *   1. Gemini API call
 *   2. JSON parse
 *   3. Field validation
 *   4. Supabase insert
 *   5. Supabase read-back
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { generateCryptoMarket } from '../src/lib/gemini';
import { insertMarket } from '../src/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// ── helpers ──────────────────────────────────────────────────────────────────

function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.error(`  ❌ ${msg}`); }
function section(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ── main ─────────────────────────────────────────────────────────────────────

async function verify() {

  // ── PRE-FLIGHT ENV CHECK ──────────────────────────────────────────────────
  section('0. ENV CHECK');
  const geminiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log(`  GEMINI_API_KEY          : ${geminiKey ? `SET (${geminiKey.slice(0,8)}...)` : 'MISSING ❌'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? `SET` : 'MISSING ❌'}`);
  console.log(`  SUPABASE_ANON_KEY       : ${supabaseKey ? `SET` : 'MISSING ❌'}`);

  if (!geminiKey || geminiKey === 'your_gemini_key_here') {
    fail('GEMINI_API_KEY is not set. Open .env and replace "your_gemini_key_here" with your real key.');
    console.log('\n  Get a key at: https://aistudio.google.com/app/apikey');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    fail('Supabase credentials missing. Cannot proceed.');
    process.exit(1);
  }

  // ── STEP 1: GEMINI API ────────────────────────────────────────────────────
  section('1. GEMINI API — generateCryptoMarket(BTC, $65000, +2.5%, 24h)');

  let analysis: Awaited<ReturnType<typeof generateCryptoMarket>>;
  try {
    analysis = await generateCryptoMarket('BTC', 65000, 2.5, '24h');
    pass('Gemini API responded successfully.');
  } catch (err) {
    fail(`Gemini API failed: ${err}`);
    process.exit(1);
  }

  // ── STEP 2: FIELD VALIDATION ──────────────────────────────────────────────
  section('2. PARSED GEMINI RESPONSE');
  console.log(JSON.stringify(analysis, null, 2));

  const requiredFields = ['title', 'description', 'agentId', 'agentPick',
    'confidence', 'probability', 'summary', 'bull_case', 'bear_case', 'keyFactors'] as const;

  let allFieldsPresent = true;
  for (const field of requiredFields) {
    const val = analysis[field];
    const ok = val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
    if (ok) {
      pass(`${field}: ${JSON.stringify(val).slice(0, 80)}`);
    } else {
      fail(`${field}: MISSING or EMPTY`);
      allFieldsPresent = false;
    }
  }

  if (!allFieldsPresent) {
    fail('Gemini response is missing required fields. Check the prompt and model output above.');
    process.exit(1);
  }

  // ── STEP 3: SUPABASE INSERT ───────────────────────────────────────────────
  section('3. SUPABASE INSERT');

  const marketPayload = {
    category: 'crypto' as const,
    subType: 'price' as const,
    title: `[VERIFY TEST] ${analysis.title}`,
    description: analysis.description,
    agentId: analysis.agentId,
    agentPick: analysis.agentPick,
    confidence: analysis.confidence,
    probability: analysis.probability,
    summary: analysis.summary,
    bull_case: analysis.bull_case,
    bear_case: analysis.bear_case,
    keyFactors: analysis.keyFactors,
    followPool: 0,
    fadePool: 0,
    resolutionTime: Date.now() + 24 * 60 * 60 * 1000,
    resolved: false,
  };

  console.log('  PRE-INSERT KEY FIELDS:');
  console.log(`    probability: ${marketPayload.probability}`);
  console.log(`    summary    : ${marketPayload.summary?.slice(0, 80)}...`);
  console.log(`    bull_case  : ${marketPayload.bull_case?.slice(0, 60)}...`);
  console.log(`    bear_case  : ${marketPayload.bear_case?.slice(0, 60)}...`);

  let inserted: any;
  try {
    inserted = await insertMarket(marketPayload);
    pass(`Inserted row id: ${inserted.id}`);
  } catch (err) {
    fail(`Supabase insert failed: ${err}`);
    process.exit(1);
  }

  // ── STEP 4: READ-BACK VERIFICATION ───────────────────────────────────────
  section('4. SUPABASE READ-BACK');

  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: row, error: readErr } = await sb
    .from('markets')
    .select('id, title, probability, confidence, summary, bull_case, bear_case, "keyFactors"')
    .eq('id', inserted.id)
    .single();

  if (readErr) {
    fail(`Read-back failed: ${readErr.message}`);
    process.exit(1);
  }

  console.log('\n  STORED ROW:');
  console.log(JSON.stringify(row, null, 2));

  const nullFields = ['probability', 'summary', 'bull_case', 'bear_case'].filter(
    f => (row as any)[f] === null || (row as any)[f] === undefined
  );

  if (nullFields.length > 0) {
    fail(`These fields are NULL in Supabase: ${nullFields.join(', ')}`);
    console.log('\n  This means the insert payload did NOT include these fields.');
    console.log('  Check the insertMarket() logs above for the PRE-INSERT PAYLOAD.');
  } else {
    pass('All key fields (probability, summary, bull_case, bear_case) are NON-NULL in Supabase!');
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  section('RESULT');
  if (nullFields.length === 0) {
    console.log('  ✅ PIPELINE VERIFIED — Gemini data flows correctly into Supabase.');
    console.log(`\n  Run: npm run seed\n  to populate all markets.`);
  } else {
    console.log('  ❌ PIPELINE BROKEN — NULL fields detected in Supabase.');
  }
}

verify().catch(err => {
  console.error('\n[verify] FATAL ERROR:', err);
  process.exit(1);
});
