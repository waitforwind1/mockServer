/**
 * Client for MockServer's live configuration control plane (GET/PUT /mockserver/configuration).
 * GET returns the full configuration; PUT applies a partial ConfigurationDTO (only the supplied
 * fields are changed), so the dashboard can tweak a setting like the log level at runtime.
 */
import { buildBaseUrl } from './mcpClient';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { translate } from '../i18n';

export type Configuration = Record<string, unknown>;

export async function getConfiguration(params: ConnectionParams, signal?: AbortSignal): Promise<Configuration> {
  const res = await fetch(`${buildBaseUrl(params)}/mockserver/configuration`, { signal });
  if (!res.ok) throw new Error(`Failed to load configuration (HTTP ${res.status} ${res.statusText})`);
  return (await res.json()) as Configuration;
}

/** Apply a partial configuration change (only the supplied keys are modified server-side). */
export async function updateConfiguration(params: ConnectionParams, partial: Configuration): Promise<void> {
  const res = await fetch(`${buildBaseUrl(params)}/mockserver/configuration`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Failed to update configuration (HTTP ${res.status} ${res.statusText})`);
  }
}

export const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'] as const;

// ---------------------------------------------------------------------------
// Effective (read-only) configuration — GET /mockserver/config
// ---------------------------------------------------------------------------

/**
 * The source tier a resolved configuration value came from. Matches the exact
 * strings emitted by the server's `effectiveConfiguration()` (`--print-config`
 * twin). `default` means the built-in default (value is that default's value);
 * sensitive values are redacted server-side to `***REDACTED***`. `unrecognised`
 * is a `mockserver.*` / `MOCKSERVER_*` key that is not a property, so is ignored
 * (value `(ignored)`, never the value that was set).
 */
export type ConfigSource =
  | 'system-property'
  | 'properties-file'
  | 'environment-variable'
  | 'default'
  | 'runtime-set'
  | 'unrecognised';

/** One resolved property from the effective configuration. */
export interface EffectiveConfigProperty {
  /** The `mockserver.*` property name. */
  name: string;
  /** The resolved value (already redacted server-side where sensitive). */
  value: string;
  /** Where the value came from. */
  source: ConfigSource | string;
  /**
   * For a property set away from its built-in default: that default, redacted
   * server-side like the value. Absent at the default and when it is unknown.
   */
  default?: string;
  /** For an `unrecognised` key: the recognised keys it was most likely meant to be. */
  suggestions?: string[];
}

/** Human-readable label + ordering weight for each known source tier. */
const CONFIG_SOURCE_LABELS_EN: Record<string, string> = {
  unrecognised: 'Unrecognised (ignored)',
  'runtime-set': 'Runtime',
  'system-property': 'System property',
  'environment-variable': 'Environment variable',
  'properties-file': 'Properties file',
  default: 'Default',
};

const CONFIG_SOURCE_LABELS_ZH: Record<string, string> = {
  unrecognised: '无法识别（已忽略）',
  'runtime-set': '运行时',
  'system-property': '系统属性',
  'environment-variable': '环境变量',
  'properties-file': '属性文件',
  default: '默认值',
};

export const CONFIG_SOURCE_LABELS: Record<string, string> = new Proxy(CONFIG_SOURCE_LABELS_EN, {
  get(target, property: string | symbol) {
    const english = Reflect.get(target, property) as unknown;
    if (typeof property !== 'string' || typeof english !== 'string') return english;
    return translate(english, CONFIG_SOURCE_LABELS_ZH[property] ?? english);
  },
});

/**
 * Fetch the effective server configuration (`GET /mockserver/config`) — the
 * `--print-config` twin. Returns one entry per recognised property, each with
 * its resolved value and source tier. Values are redacted server-side.
 */
export async function getEffectiveConfiguration(
  params: ConnectionParams,
  signal?: AbortSignal,
): Promise<EffectiveConfigProperty[]> {
  const res = await fetch(`${buildBaseUrl(params)}/mockserver/config`, { signal });
  if (!res.ok) throw new Error(`Failed to load effective configuration (HTTP ${res.status} ${res.statusText})`);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as EffectiveConfigProperty[]) : [];
}

// ---------------------------------------------------------------------------
// Bound ports + build info — PUT /mockserver/status
// ---------------------------------------------------------------------------

/** Server status payload (`PUT /mockserver/status`) — bound ports plus build info. */
export interface ServerStatus {
  /** The ports MockServer is currently listening on. */
  ports: number[];
  version?: string;
  artifactId?: string;
  groupId?: string;
  gitHash?: string;
}

/**
 * Fetch the running server's bound ports and build info (`PUT /mockserver/status`).
 * PUT (not GET) is the control-plane verb this endpoint uses.
 */
export async function getServerStatus(
  params: ConnectionParams,
  signal?: AbortSignal,
): Promise<ServerStatus> {
  const res = await fetch(`${buildBaseUrl(params)}/mockserver/status`, { method: 'PUT', signal });
  if (!res.ok) throw new Error(`Failed to load server status (HTTP ${res.status} ${res.statusText})`);
  const data = (await res.json()) as Partial<ServerStatus> | null;
  return {
    ports: Array.isArray(data?.ports) ? (data!.ports as number[]) : [],
    version: data?.version,
    artifactId: data?.artifactId,
    groupId: data?.groupId,
    gitHash: data?.gitHash,
  };
}

// ---------------------------------------------------------------------------
// Proxy setup — GET /mockserver/proxyConfiguration
// ---------------------------------------------------------------------------

/**
 * Proxy setup information served by `GET /mockserver/proxyConfiguration`:
 * the HTTPS proxy URL, ready-to-paste OS environment-variable blocks, and the
 * CA certificate (path + PEM) a client must trust to intercept TLS traffic.
 */
export interface ProxyConfiguration {
  /** Filesystem path (on the server) of the written CA certificate. */
  caCertificatePath: string;
  /** The CA public certificate in PEM form (private key is never exposed). */
  caCertificatePem: string;
  /** The `https_proxy` URL clients should point at (e.g. `http://host:1080`). */
  httpsProxy: string;
  /** Copy-paste environment-variable blocks for common shells. */
  environmentVariables: {
    unix: string;
    powershell: string;
  };
  /** True when the built-in default CA is in use (vs a custom-provided one). */
  usingDefaultCa: boolean;
  /** Optional server-side warning (e.g. default CA in production), else null. */
  warning: string | null;
}

/**
 * Fetch the proxy setup information (`GET /mockserver/proxyConfiguration`).
 *
 * @throws Error with the server's `{ "error": ... }` body on a non-2xx response.
 */
export async function getProxyConfiguration(
  params: ConnectionParams,
  signal?: AbortSignal,
): Promise<ProxyConfiguration> {
  const res = await fetch(`${buildBaseUrl(params)}/mockserver/proxyConfiguration`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Failed to load proxy configuration (HTTP ${res.status} ${res.statusText})`);
  }
  const data = (await res.json()) as Partial<ProxyConfiguration> | null;
  const env = (data?.environmentVariables ?? {}) as Partial<ProxyConfiguration['environmentVariables']>;
  return {
    caCertificatePath: data?.caCertificatePath ?? '',
    caCertificatePem: data?.caCertificatePem ?? '',
    httpsProxy: data?.httpsProxy ?? '',
    environmentVariables: {
      unix: env.unix ?? '',
      powershell: env.powershell ?? '',
    },
    usingDefaultCa: data?.usingDefaultCa === true,
    warning: data?.warning ?? null,
  };
}

// ---------------------------------------------------------------------------
// Bind additional port — PUT /mockserver/bind
// ---------------------------------------------------------------------------

/**
 * Ask the server to bind an additional listening port (`PUT /mockserver/bind`).
 * The body is a `PortBinding` (`{ "ports": [<port>] }`); the response echoes the
 * full set of ports the server is now listening on.
 *
 * @returns the complete list of bound ports after the bind.
 * @throws Error with the server's message on a non-2xx response (e.g. 400 when
 *         the port is already in use).
 */
export async function bindAdditionalPort(
  params: ConnectionParams,
  port: number,
): Promise<number[]> {
  const res = await fetch(`${buildBaseUrl(params)}/mockserver/bind`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ports: [port] }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Failed to bind port (HTTP ${res.status} ${res.statusText})`);
  }
  const data = (await res.json()) as Partial<{ ports: number[] }> | null;
  return Array.isArray(data?.ports) ? (data!.ports as number[]) : [];
}

// ---------------------------------------------------------------------------
// Editable property descriptors
// ---------------------------------------------------------------------------

/** The control type rendered for an editable property. */
export type EditableType = 'boolean' | 'string' | 'number';

/**
 * Descriptor for a runtime-mutable configuration property that should be
 * editable in the dashboard.  Adding an entry here is all that is needed to
 * expose a new toggle / field — ConfigurationDialog drives its controls from
 * this list.
 */
export interface EditablePropertyDescriptor {
  /** The JSON key in ConfigurationDTO. */
  key: string;
  /** Human-readable label shown next to the control. */
  label: string;
  /** Control type. */
  type: EditableType;
  /** Short tooltip / help text. */
  help: string;
  /** Logical group (controls are rendered grouped). */
  group: string;
}

/**
 * Declarative list of runtime-mutable properties beyond the original three
 * (logLevel, detailedMatchFailures, metricsEnabled — which keep their
 * bespoke controls).
 *
 * Order within each group determines render order.
 */
const EDITABLE_PROPERTIES_EN: readonly EditablePropertyDescriptor[] = [
  // Developer / data
  // NOTE: devMode is intentionally NOT runtime-editable — its only effect is supplying the
  // startup defaults for maxLogEntries/maxExpectations, which size the log ring buffer and
  // expectation store at construction time and are never resized at runtime. Changing it on a
  // running server would mislead (no effect), so it stays in the read-only table.
  {
    key: 'generateRealisticExampleValues',
    label: 'Realistic example values',
    type: 'boolean',
    help: 'Generate realistic (Faker-style) example values in stubs instead of fixed placeholders.',
    group: 'Developer / data',
  },
  {
    key: 'attachMismatchDiagnosticToResponse',
    label: 'Mismatch diagnostic in response',
    type: 'boolean',
    help: 'Attach detailed mismatch diagnostics to unmatched-request responses.',
    group: 'Developer / data',
  },

  // Validation proxy
  {
    key: 'validateProxyOpenAPISpec',
    label: 'OpenAPI spec (URL / path)',
    type: 'string',
    help: 'OpenAPI specification URL, file path, or inline JSON/YAML used to validate proxied traffic.',
    group: 'Validation proxy',
  },
  {
    key: 'validateProxyEnforce',
    label: 'Enforce validation',
    type: 'boolean',
    help: 'When enabled, proxied requests that violate the OpenAPI spec are rejected.',
    group: 'Validation proxy',
  },

  // Chaos auto-halt
  {
    key: 'chaosAutoHaltEnabled',
    label: 'Auto-halt enabled',
    type: 'boolean',
    help: 'Automatically halt chaos injection when the error threshold is exceeded.',
    group: 'Chaos auto-halt',
  },
  {
    key: 'chaosAutoHaltErrorThreshold',
    label: 'Error threshold',
    type: 'number',
    help: 'Maximum number of errors within the window before chaos is halted.',
    group: 'Chaos auto-halt',
  },
  {
    key: 'chaosAutoHaltWindowMillis',
    label: 'Window (ms)',
    type: 'number',
    help: 'Sliding window in milliseconds over which errors are counted for auto-halt.',
    group: 'Chaos auto-halt',
  },

  // Matching & proxying — read live on every request/match, so safe to change at runtime
  {
    key: 'matchersFailFast',
    label: 'Matchers fail fast',
    type: 'boolean',
    help: 'Stop evaluating a request matcher at the first non-matching field instead of collecting every mismatch. Read live on each match.',
    group: 'Matching & proxying',
  },
  {
    key: 'attemptToProxyIfNoMatchingExpectation',
    label: 'Proxy unmatched requests',
    type: 'boolean',
    help: 'When no expectation matches, forward the request to its Host instead of returning 404. Read live on each request.',
    group: 'Matching & proxying',
  },
  {
    key: 'maximumNumberOfRequestToReturnInVerificationFailure',
    label: 'Max requests in verification failure',
    type: 'number',
    help: 'Cap on the number of recorded requests included in a verification failure message. Read live when a verification fails.',
    group: 'Matching & proxying',
  },

  // Logging — read live on every log write, so safe to change at runtime
  {
    key: 'disableLogging',
    label: 'Disable logging',
    type: 'boolean',
    help: 'Suppress all MockServer log output. Read live on each log write.',
    group: 'Logging',
  },
  {
    key: 'compactLogFormat',
    label: 'Compact log format',
    type: 'boolean',
    help: 'Render log entries in a single-line compact format. Read live on each log write.',
    group: 'Logging',
  },

  // CORS — read live when building responses / handling preflight, so safe to change at runtime
  {
    key: 'enableCORSForAPI',
    label: 'Answer CORS preflights on every path',
    type: 'boolean',
    help: 'Answer CORS preflights that no expectation matches, for mocked paths, using corsAllowOrigin; the first preflight MockServer answers itself turns this on. MockServer\'s own API answers preflights under controlPlaneCorsAllowOrigin (set at startup) whatever this is. Read live per request.',
    group: 'CORS',
  },
  {
    key: 'enableCORSForAllResponses',
    label: 'CORS for mocked responses',
    type: 'boolean',
    help: 'Add CORS headers, using corsAllowOrigin, to mocked and proxied responses. Does not change which pages may use MockServer\'s own API. Read live per response.',
    group: 'CORS',
  },

  // Analytics — anonymous, cookieless dashboard usage stats
  {
    key: 'dashboardAnalyticsEnabled',
    label: 'Dashboard usage analytics',
    type: 'boolean',
    help: 'Send anonymous, cookieless dashboard usage stats (no request or mock data) to improve the UI.',
    group: 'Analytics',
  },
  // NOTE: dashboardAnalyticsEndpoint is intentionally NOT runtime-editable — it decides where
  // every dashboard viewer's browser sends events, so the server fixes it at startup and ignores
  // a PUT of it. It stays in the read-only table.
  {
    key: 'dashboardAnalyticsKey',
    label: 'Analytics key',
    type: 'string',
    help: 'PostHog write-only project key. Blank disables analytics.',
    group: 'Analytics',
  },

] as const;

const EDITABLE_PROPERTY_ZH: Record<string, Pick<EditablePropertyDescriptor, 'label' | 'help' | 'group'>> = {
  generateRealisticExampleValues: { label: '真实示例值', help: '在存根中生成真实的 Faker 风格示例值，而不是固定占位符。', group: '开发者 / 数据' },
  attachMismatchDiagnosticToResponse: { label: '响应中的不匹配诊断', help: '将详细的不匹配诊断附加到未匹配请求的响应中。', group: '开发者 / 数据' },
  validateProxyOpenAPISpec: { label: 'OpenAPI 规范（URL / 路径）', help: '用于验证代理流量的 OpenAPI 规范 URL、文件路径或内联 JSON/YAML。', group: '验证代理' },
  validateProxyEnforce: { label: '强制验证', help: '启用后，将拒绝违反 OpenAPI 规范的代理请求。', group: '验证代理' },
  chaosAutoHaltEnabled: { label: '启用自动停止', help: '错误数超过阈值时自动停止混沌注入。', group: '混沌自动停止' },
  chaosAutoHaltErrorThreshold: { label: '错误阈值', help: '在时间窗口内达到此最大错误数后停止混沌注入。', group: '混沌自动停止' },
  chaosAutoHaltWindowMillis: { label: '时间窗口（毫秒）', help: '计算自动停止错误数所使用的滑动时间窗口（毫秒）。', group: '混沌自动停止' },
  matchersFailFast: { label: '匹配器快速失败', help: '请求匹配器遇到首个不匹配字段时停止，而不再收集全部差异。每次匹配时实时读取。', group: '匹配与代理' },
  attemptToProxyIfNoMatchingExpectation: { label: '代理未匹配请求', help: '没有期望匹配时，将请求转发到其 Host，而不是返回 404。每次请求时实时读取。', group: '匹配与代理' },
  maximumNumberOfRequestToReturnInVerificationFailure: { label: '验证失败中的最大请求数', help: '限制验证失败消息中包含的已记录请求数。验证失败时实时读取。', group: '匹配与代理' },
  disableLogging: { label: '禁用日志', help: '禁止所有 MockServer 日志输出。每次写入日志时实时读取。', group: '日志' },
  compactLogFormat: { label: '紧凑日志格式', help: '以单行紧凑格式呈现日志条目。每次写入日志时实时读取。', group: '日志' },
  enableCORSForAPI: { label: '在所有路径上响应 CORS 预检', help: '对没有期望匹配的模拟路径响应 CORS 预检，并使用 corsAllowOrigin；MockServer 首次自行响应预检时会启用此项。MockServer 自身 API 始终按启动时设置的 controlPlaneCorsAllowOrigin 响应预检。每次请求时实时读取。', group: 'CORS' },
  enableCORSForAllResponses: { label: '模拟响应的 CORS', help: '使用 corsAllowOrigin 为模拟和代理响应添加 CORS 响应头。不会改变哪些页面可使用 MockServer 自身 API。每次响应时实时读取。', group: 'CORS' },
  dashboardAnalyticsEnabled: { label: '仪表盘使用情况分析', help: '发送匿名且不使用 Cookie 的仪表盘使用统计（不包含请求或模拟数据），以帮助改进界面。', group: '分析' },
  dashboardAnalyticsKey: { label: '分析密钥', help: 'PostHog 只写项目密钥。留空会禁用分析。', group: '分析' },
};

function localiseEditableProperty(descriptor: EditablePropertyDescriptor): EditablePropertyDescriptor {
  return new Proxy(descriptor, {
    get(target, property: string | symbol) {
      const value = Reflect.get(target, property) as unknown;
      if (typeof property !== 'string' || typeof value !== 'string') return value;
      const chinese = EDITABLE_PROPERTY_ZH[target.key]?.[property as 'label' | 'help' | 'group'];
      return chinese ? translate(value, chinese) : value;
    },
  });
}

export const EDITABLE_PROPERTIES: readonly EditablePropertyDescriptor[] = EDITABLE_PROPERTIES_EN.map(localiseEditableProperty);
