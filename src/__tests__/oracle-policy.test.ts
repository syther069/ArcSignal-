import { describe, expect, it } from 'vitest';
import {
  assertFreshGenerationObservation,
  decideCryptoResolution,
  ORACLE_POLICY_VERSION,
  parseCryptoOracleSpec,
  parseMarketTimeframe,
  type CryptoOracleSpec,
} from '@/lib/oracle-policy';

const resolutionTimestamp = 1_788_000_000;
const spec: CryptoOracleSpec = {
  version: ORACLE_POLICY_VERSION,
  provider: 'coingecko',
  symbol: 'BTC',
  targetPrice: 100_000,
  comparator: 'gte',
  resolutionTimestamp,
  maxObservationDelaySeconds: 120,
};

describe('oracle policy', () => {
  it('requires canonical machine-readable policy matching the on-chain timestamp', () => {
    expect(parseCryptoOracleSpec(JSON.stringify({ oracle: spec }), resolutionTimestamp)).toEqual(spec);
    expect(() => parseCryptoOracleSpec('{}', resolutionTimestamp)).toThrow('policy is missing');
    expect(() => parseCryptoOracleSpec(
      JSON.stringify({ oracle: { ...spec, resolutionTimestamp: resolutionTimestamp + 1 } }),
      resolutionTimestamp,
    )).toThrow('policy is invalid');
  });

  it('never resolves before expiry', () => {
    expect(decideCryptoResolution(spec, {
      provider: 'coingecko',
      symbol: 'BTC',
      price: 101_000,
      observedAt: resolutionTimestamp - 1,
    }, resolutionTimestamp - 1)).toEqual({
      action: 'wait',
      reason: 'market has not reached its resolution timestamp',
    });
  });

  it('resolves from a matching observation close to the declared timestamp', () => {
    expect(decideCryptoResolution(spec, {
      provider: 'coingecko',
      symbol: 'BTC',
      price: 101_000,
      observedAt: resolutionTimestamp + 30,
    }, resolutionTimestamp + 35)).toMatchObject({ action: 'resolve', outcome: 1 });
    expect(decideCryptoResolution(spec, {
      provider: 'coingecko',
      symbol: 'BTC',
      price: 99_000,
      observedAt: resolutionTimestamp + 30,
    }, resolutionTimestamp + 35)).toMatchObject({ action: 'resolve', outcome: 2 });
  });

  it('fails closed for stale or wrong-provider observations', () => {
    expect(decideCryptoResolution(spec, {
      provider: 'binance',
      symbol: 'BTC',
      price: 101_000,
      observedAt: resolutionTimestamp,
    }, resolutionTimestamp)).toMatchObject({ action: 'manual-review' });
    expect(decideCryptoResolution(spec, {
      provider: 'coingecko',
      symbol: 'BTC',
      price: 101_000,
      observedAt: resolutionTimestamp - 1,
    }, resolutionTimestamp)).toMatchObject({ action: 'manual-review' });
    expect(decideCryptoResolution(spec, {
      provider: 'coingecko',
      symbol: 'BTC',
      price: 101_000,
      observedAt: resolutionTimestamp + 121,
    }, resolutionTimestamp + 121)).toMatchObject({ action: 'manual-review' });
  });

  it('requires fresh CoinGecko data before deriving a market threshold', () => {
    const observation = {
      provider: 'coingecko' as const,
      symbol: 'BTC',
      price: 100_000,
      observedAt: resolutionTimestamp,
    };
    expect(() => assertFreshGenerationObservation(
      observation,
      resolutionTimestamp + 60,
    )).not.toThrow();
    expect(() => assertFreshGenerationObservation(
      observation,
      resolutionTimestamp + 121,
    )).toThrow('stale');
    expect(() => assertFreshGenerationObservation(
      { ...observation, observedAt: resolutionTimestamp + 31 },
      resolutionTimestamp,
    )).toThrow('future-dated');
    expect(() => assertFreshGenerationObservation(
      { ...observation, provider: 'binance' },
      resolutionTimestamp,
    )).toThrow('invalid');
  });

  it('parses only the canonical generated market ID shape', () => {
    expect(parseMarketTimeframe('BTC-PRICE-15m-1788000000')).toBe('15m');
    expect(parseMarketTimeframe('BTC-15m-random')).toBeNull();
  });
});