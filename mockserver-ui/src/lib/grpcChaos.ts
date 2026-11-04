/**
 * Client for MockServer's gRPC fault-injection chaos control-plane endpoint
 * (`/mockserver/grpcChaos`). Register one gRPC chaos profile per service
 * and have it applied to every matched RPC call to that service, with an
 * optional time-to-live (auto-revert).
 */
import { buildBaseUrl } from './mcpClient';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { translate } from '../i18n';

/** Mirror of the server's GrpcChaosProfileDTO (all fields optional). */
export interface GrpcChaosProfileDTO {
  errorStatusCode?: string;
  errorMessage?: string;
  errorProbability?: number;
  seed?: number;
  latencyMs?: number;
  succeedFirst?: number;
  failRequestCount?: number;
  quotaName?: string;
  quotaLimit?: number;
  quotaWindowMillis?: number;
  omitGrpcStatus?: boolean;
  corruptGrpcStatus?: boolean;
  customTrailers?: Record<string, string>;
  abortAfterMessages?: number;
}

export interface GrpcChaosResponse {
  services: Record<string, GrpcChaosProfileDTO>;
  /** Present only for TTL-bearing registrations: service -> remaining ms. */
  ttlRemainingMillis?: Record<string, number>;
}

function endpoint(params: ConnectionParams): string {
  return `${buildBaseUrl(params)}/mockserver/grpcChaos`;
}

async function ensureOk(res: Response): Promise<void> {
  if (res.ok) return;
  let message = `HTTP ${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { error?: unknown };
    if (body && typeof body.error === 'string') message = body.error;
  } catch {
    // non-JSON body -- keep the status-line message
  }
  throw new Error(message);
}

/** Fetch the current gRPC fault-injection chaos registrations and TTL countdowns. */
export async function fetchGrpcChaos(
  params: ConnectionParams,
  signal?: AbortSignal,
): Promise<GrpcChaosResponse> {
  const res = await fetch(endpoint(params), { signal });
  await ensureOk(res);
  const body = (await res.json()) as Partial<GrpcChaosResponse>;
  return { services: body.services ?? {}, ttlRemainingMillis: body.ttlRemainingMillis };
}

/** Register (or replace) the gRPC chaos profile for a service, optionally with a TTL (ms). */
export async function registerGrpcChaos(
  params: ConnectionParams,
  service: string,
  chaos: GrpcChaosProfileDTO,
  ttlMillis?: number,
): Promise<void> {
  const payload: Record<string, unknown> = { service, chaos };
  if (ttlMillis != null && ttlMillis > 0) payload.ttlMillis = ttlMillis;
  const res = await fetch(endpoint(params), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await ensureOk(res);
}

/** Remove the gRPC chaos profile registered for a single service. */
export async function removeGrpcChaos(params: ConnectionParams, service: string): Promise<void> {
  const res = await fetch(endpoint(params), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, remove: true }),
  });
  await ensureOk(res);
}

/** Clear all gRPC fault-injection chaos registrations. */
export async function clearGrpcChaos(params: ConnectionParams): Promise<void> {
  const res = await fetch(endpoint(params), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clear: true }),
  });
  await ensureOk(res);
}

/** Patch (partially update) the gRPC chaos profile for a service. */
export async function patchGrpcChaos(
  params: ConnectionParams,
  service: string,
  partial: Partial<GrpcChaosProfileDTO>,
): Promise<void> {
  const res = await fetch(endpoint(params), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, chaos: partial }),
  });
  await ensureOk(res);
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Human-readable summary chips for a gRPC chaos profile -- one short phrase per
 * populated facet, in a stable order. Empty when nothing is configured.
 */
export function summarizeGrpcChaosProfile(profile: GrpcChaosProfileDTO): string[] {
  const parts: string[] = [];
  if (profile.errorStatusCode != null) {
    const prob = profile.errorProbability != null ? ` @ ${pct(profile.errorProbability)}` : '';
    parts.push(`${profile.errorStatusCode}${prob}`);
  }
  if (profile.latencyMs != null) {
    parts.push(translate(`+${profile.latencyMs}ms latency`, `+${profile.latencyMs}ms 延迟`));
  }
  if (profile.quotaName != null || profile.quotaLimit != null) {
    const limit = profile.quotaLimit != null ? ` ${profile.quotaLimit}` : '';
    const window = profile.quotaWindowMillis != null ? `/${Math.round(profile.quotaWindowMillis / 1000)}s` : '';
    parts.push(translate(`quota${limit}${window}`.trim(), `配额${limit}${window}`.trim()));
  }
  if (profile.succeedFirst != null || profile.failRequestCount != null) {
    const succeed = profile.succeedFirst != null
      ? translate(`succeed first ${profile.succeedFirst}`, `前 ${profile.succeedFirst} 次成功`)
      : null;
    const fail = profile.failRequestCount != null
      ? translate(`fail ${profile.failRequestCount}`, `失败 ${profile.failRequestCount} 次`)
      : null;
    parts.push([succeed, fail].filter(Boolean).join(', '));
  }
  if (profile.errorMessage != null) {
    parts.push(translate(`msg: ${profile.errorMessage}`, `消息：${profile.errorMessage}`));
  }
  if (profile.seed != null) {
    parts.push(translate(`seed ${profile.seed}`, `种子 ${profile.seed}`));
  }
  if (profile.omitGrpcStatus) {
    parts.push(translate('omit grpc-status', '省略 grpc-status'));
  }
  if (profile.corruptGrpcStatus) {
    parts.push(translate('corrupt grpc-status', '破坏 grpc-status'));
  }
  const trailerCount = profile.customTrailers != null ? Object.keys(profile.customTrailers).length : 0;
  if (trailerCount > 0) {
    parts.push(translate(
      `${trailerCount} custom trailer${trailerCount === 1 ? '' : 's'}`,
      `${trailerCount} 个自定义尾部元数据`,
    ));
  }
  if (profile.abortAfterMessages != null) {
    parts.push(translate(
      `abort after ${profile.abortAfterMessages} msg${profile.abortAfterMessages === 1 ? '' : 's'}`,
      `${profile.abortAfterMessages} 条消息后中止`,
    ));
  }
  return parts;
}
