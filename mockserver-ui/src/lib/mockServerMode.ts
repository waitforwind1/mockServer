/**
 * Client for MockServer's operating-mode control endpoint
 * (`/mockserver/mode`). Lets the dashboard read and switch between the
 * SIMULATE / SPY / CAPTURE record-and-replay workflows.
 */
import { buildBaseUrl } from './mcpClient';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { translate } from '../i18n';

export type MockServerMode = 'SIMULATE' | 'SPY' | 'CAPTURE';

export const MOCK_SERVER_MODES: MockServerMode[] = ['SIMULATE', 'SPY', 'CAPTURE'];

export interface ModeResponse {
  mode: MockServerMode;
  proxyUnmatchedRequests: boolean;
}

/** A short, user-facing description of what each mode does. */
export const MODE_DESCRIPTIONS: Record<MockServerMode, string> = {
  get SIMULATE() {
    return translate('Match expectations; unmatched requests return 404', '匹配期望；未匹配的请求返回 404');
  },
  get SPY() {
    return translate('Match expectations; forward & record unmatched requests', '匹配期望；转发并记录未匹配的请求');
  },
  get CAPTURE() {
    return translate(
      'Forward & record all traffic (captures everything when no expectations are set)',
      '转发并记录所有流量（未设置期望时捕获全部流量）',
    );
  },
};

/** Fetch the current operating mode. */
export async function fetchMode(
  params: ConnectionParams,
  signal?: AbortSignal,
): Promise<ModeResponse> {
  const res = await fetch(`${buildBaseUrl(params)}/mockserver/mode`, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<ModeResponse>;
}

/** Switch the operating mode. */
export async function setMode(
  params: ConnectionParams,
  mode: MockServerMode,
): Promise<ModeResponse> {
  const res = await fetch(
    `${buildBaseUrl(params)}/mockserver/mode?mode=${encodeURIComponent(mode)}`,
    { method: 'PUT' },
  );
  if (!res.ok) {
    throw new Error((await res.text()) || `HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<ModeResponse>;
}
