import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  calculateTnSource,
  encryptDes,
  encryptFingerprintFields,
  getShumeiDeviceId,
  invalidateShumeiDeviceId,
} from '../functions/_utils/shumei';

afterEach(() => {
  invalidateShumeiDeviceId();
});

describe('Shumei fingerprint encoding', () => {
  it('matches the DES ECB reference vector', () => {
    expect(encryptDes('web', 'je6vk6t4')).toBe('qeDGcpUpK4Y=');
  });

  it('obfuscates known fields and ignores unsupported fields', () => {
    expect(encryptFingerprintFields({ protocol: 102, os: 'web', unsupported: 'value' })).toEqual({
      protocol: 102,
      pj: 'qeDGcpUpK4Y=',
    });
  });

  it('sorts values and scales numeric values when calculating tn', () => {
    expect(calculateTnSource({ text: 'last', count: 2, alpha: 'first' })).toBe(
      'first20000last'
    );
  });
});

describe('Shumei device cache', () => {
  it('deduplicates concurrent device requests', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ code: 1100, detail: { deviceId: 'device-id' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const dependencies = {
      fetcher,
      now: () => 1_720_000_000_000,
      randomUUID: () => '11111111-1111-4111-8111-111111111111',
    };

    const [first, second] = await Promise.all([
      getShumeiDeviceId(dependencies),
      getShumeiDeviceId(dependencies),
    ]);

    expect(first).toBe('Bdevice-id');
    expect(second).toBe('Bdevice-id');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
