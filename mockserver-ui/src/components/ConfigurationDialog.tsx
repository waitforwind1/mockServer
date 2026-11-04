import { useState, useEffect, useCallback, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { useDashboardStore } from '../store';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import { monospaceFontFamily } from '../theme';
import HumanErrorAlert from './HumanErrorAlert';
import CopyButton from './CopyButton';
import { useI18n } from '../i18n';
import {
  getConfiguration,
  updateConfiguration,
  getEffectiveConfiguration,
  getServerStatus,
  getProxyConfiguration,
  bindAdditionalPort,
  CONFIG_SOURCE_LABELS,
  LOG_LEVELS,
  EDITABLE_PROPERTIES,
  type Configuration,
  type EditablePropertyDescriptor,
  type EffectiveConfigProperty,
  type ServerStatus,
  type ProxyConfiguration,
} from '../lib/configuration';

function valueToText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Group the descriptor list by `group` field, preserving insertion order. */
function groupDescriptors(descriptors: readonly EditablePropertyDescriptor[]): Map<string, EditablePropertyDescriptor[]> {
  const groups = new Map<string, EditablePropertyDescriptor[]>();
  for (const d of descriptors) {
    const list = groups.get(d.group);
    if (list) {
      list.push(d);
    } else {
      groups.set(d.group, [d]);
    }
  }
  return groups;
}

function configText(english: string, tr: (en: string, zh: string) => string): string {
  const chinese: Record<string, string> = {
    'Realistic example values': '生成真实示例值',
    'Mismatch diagnostic in response': '在响应中附加不匹配诊断',
    'OpenAPI spec (URL / path)': 'OpenAPI 规范（URL / 路径）',
    'Enforce validation': '强制验证',
    'Auto-halt enabled': '启用自动停止',
    'Error threshold': '错误阈值',
    'Window (ms)': '时间窗口（毫秒）',
    'Matchers fail fast': 'Matcher 快速失败',
    'Proxy unmatched requests': '代理未匹配请求',
    'Max requests in verification failure': '验证失败中最多显示的请求数',
    'Disable logging': '禁用日志',
    'Compact log format': '紧凑日志格式',
    'Answer CORS preflights on every path': '在所有路径响应 CORS 预检',
    'CORS for mocked responses': '为模拟响应添加 CORS',
    'Dashboard usage analytics': '仪表板使用分析',
    'Analytics key': '分析服务密钥',
    'Developer / data': '开发与数据',
    'Validation proxy': '验证代理',
    'Chaos auto-halt': 'Chaos 自动停止',
    'Matching & proxying': '匹配与代理',
    Logging: '日志',
    CORS: 'CORS',
    Analytics: '分析',
    'Generate realistic (Faker-style) example values in stubs instead of fixed placeholders.': '在 Stub 中生成逼真的 Faker 风格示例值，而不是固定占位符。',
    'Attach detailed mismatch diagnostics to unmatched-request responses.': '在未匹配请求的响应中附加详细的不匹配诊断。',
    'OpenAPI specification URL, file path, or inline JSON/YAML used to validate proxied traffic.': '用于验证代理流量的 OpenAPI 规范 URL、文件路径或内联 JSON/YAML。',
    'When enabled, proxied requests that violate the OpenAPI spec are rejected.': '启用后，拒绝违反 OpenAPI 规范的代理请求。',
    'Automatically halt chaos injection when the error threshold is exceeded.': '错误数超过阈值时自动停止 Chaos 注入。',
    'Maximum number of errors within the window before chaos is halted.': '时间窗口内触发停止 Chaos 的最大错误数。',
    'Sliding window in milliseconds over which errors are counted for auto-halt.': '用于统计自动停止错误数的滑动窗口（毫秒）。',
    'Stop evaluating a request matcher at the first non-matching field instead of collecting every mismatch. Read live on each match.': '遇到第一个不匹配字段时停止评估请求 Matcher，而不是收集所有差异；每次匹配时实时读取。',
    'When no expectation matches, forward the request to its Host instead of returning 404. Read live on each request.': '没有期望匹配时，将请求转发到其 Host，而不是返回 404；每个请求实时读取。',
    'Cap on the number of recorded requests included in a verification failure message. Read live when a verification fails.': '限制验证失败消息中包含的已记录请求数；验证失败时实时读取。',
    'Suppress all MockServer log output. Read live on each log write.': '禁止所有 MockServer 日志输出；每次写日志时实时读取。',
    'Render log entries in a single-line compact format. Read live on each log write.': '以单行紧凑格式渲染日志条目；每次写日志时实时读取。',
    'Send anonymous, cookieless dashboard usage stats (no request or mock data) to improve the UI.': '发送匿名且不使用 Cookie 的仪表板使用统计（不含请求或 Mock 数据），用于改进界面。',
    'PostHog write-only project key. Blank disables analytics.': 'PostHog 只写项目密钥；留空可禁用分析。',
  };
  return tr(english, chinese[english] ?? english);
}

export default function ConfigurationDialog({
  open,
  onClose,
  connectionParams,
}: {
  open: boolean;
  onClose: () => void;
  connectionParams: ConnectionParams;
}) {
  const theme = useTheme();
  const { tr } = useI18n();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [config, setConfig] = useState<Configuration | null>(null);
  const [error, setError] = useState<HumanError | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Server Info tab (read-only): effective configuration with source tiers and
  // the bound ports. Fetched lazily when the tab is first opened.
  const [tab, setTab] = useState<'settings' | 'info'>('settings');
  const [effectiveConfig, setEffectiveConfig] = useState<EffectiveConfigProperty[] | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [infoError, setInfoError] = useState<HumanError | null>(null);
  // Proxy setup is fetched independently so a proxy failure does not hide the
  // effective-config / bound-ports panel.
  const [proxyConfig, setProxyConfig] = useState<ProxyConfiguration | null>(null);
  const [proxyError, setProxyError] = useState<HumanError | null>(null);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // Reset to the Settings tab and drop any loaded Server Info each time the
  // dialog transitions to open, so every open starts clean and re-fetches. This
  // uses the "adjust state during render on a prop change" pattern (React's
  // endorsed alternative to a setState-in-effect) rather than an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTab('settings');
      setEffectiveConfig(null);
      setServerStatus(null);
      setInfoError(null);
      setProxyConfig(null);
      setProxyError(null);
    }
  }

  // Fetch the effective configuration + bound ports when the Server Info tab is
  // opened (once per open — the data is read-only). Both calls run together.
  useEffect(() => {
    if (!open || tab !== 'info' || effectiveConfig !== null) return;
    let cancelled = false;
    const controller = new AbortController();
    async function loadInfo(): Promise<void> {
      try {
        const [cfg, status] = await Promise.all([
          getEffectiveConfiguration(connectionParams, controller.signal),
          getServerStatus(connectionParams, controller.signal),
        ]);
        if (cancelled) return;
        setEffectiveConfig(cfg);
        setServerStatus(status);
        setInfoError(null);
      } catch (e) {
        if (!cancelled) setInfoError(humanizeError(e));
      }
    }
    void loadInfo();
    // Proxy setup — best-effort, own error surface (a proxy failure must not
    // hide the effective-config / bound-ports panel).
    getProxyConfiguration(connectionParams, controller.signal)
      .then((proxy) => { if (!cancelled) { setProxyConfig(proxy); setProxyError(null); } })
      .catch((e) => { if (!cancelled) setProxyError(humanizeError(e)); });
    return () => { cancelled = true; controller.abort(); };
  }, [open, tab, effectiveConfig, connectionParams]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const next = await getConfiguration(connectionParams);
        if (cancelled) return;
        setConfig(next);
        useDashboardStore.getState().setServerConfiguration(next);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(humanizeError(e));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, connectionParams, refreshTick]);

  const apply = useCallback(async (partial: Configuration) => {
    setBusy(true);
    setError(null);
    try {
      await updateConfiguration(connectionParams, partial);
      refresh();
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }, [connectionParams, refresh]);

  const logLevel = typeof config?.['logLevel'] === 'string' ? (config['logLevel'] as string) : 'INFO';
  const detailed = config?.['detailedMatchFailures'] === true;
  const metrics = config?.['metricsEnabled'] === true;

  const editableKeys = useMemo(() => new Set(EDITABLE_PROPERTIES.map((d) => d.key)), []);
  const grouped = useMemo(() => groupDescriptors(EDITABLE_PROPERTIES), []);

  // Read-only table excludes the three bespoke controls AND all descriptor-driven keys
  const entries = config
    ? Object.entries(config).filter(
        ([k, v]) =>
          v != null &&
          valueToText(v) !== '' &&
          !editableKeys.has(k) &&
          k !== 'logLevel' &&
          k !== 'detailedMatchFailures' &&
          k !== 'metricsEnabled',
      )
    : [];

  const disabled = busy || !config;

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen} aria-labelledby="configuration-dialog-title">
      <DialogTitle id="configuration-dialog-title">{tr('Server Configuration', '服务器配置')}</DialogTitle>
      <DialogContent>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as 'settings' | 'info')}
          sx={{ mb: 1.5, minHeight: 36 }}
        >
          <Tab value="settings" label={tr('Settings', '设置')} sx={{ minHeight: 36, textTransform: 'none' }} />
          <Tab value="info" label={tr('Server Info', '服务器信息')} sx={{ minHeight: 36, textTransform: 'none' }} />
        </Tabs>

        {tab === 'settings' && (
          <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr('Inspect the running server configuration and change common runtime settings. Changes apply immediately to this server.', '查看正在运行的服务器配置并更改常用运行时设置。更改会立即应用到此服务器。')}
        </Typography>
        {error && <HumanErrorAlert error={error} sx={{ mb: 1.5 }} />}

        {/* --- Original bespoke controls --- */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{tr('Log level', '日志级别')}</Typography>
            <Select size="small" value={logLevel} disabled={disabled}
              onChange={(e) => void apply({ logLevel: e.target.value })} sx={{ width: 120 }}>
              {LOG_LEVELS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </Box>
          <FormControlLabel
            control={<Switch size="small" checked={detailed} disabled={disabled}
              onChange={(e) => void apply({ detailedMatchFailures: e.target.checked })} />}
            label={<Typography variant="body2">{tr('Detailed match failures', '详细匹配失败信息')}</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={metrics} disabled={disabled}
              onChange={(e) => void apply({ metricsEnabled: e.target.checked })} />}
            label={<Typography variant="body2">{tr('Metrics enabled', '启用指标')}</Typography>}
          />
        </Box>

        {/* --- Descriptor-driven editable controls (grouped) --- */}
        {Array.from(grouped.entries()).map(([group, descriptors]) => (
          <Box key={group} sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              {configText(group, tr)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {descriptors.map((d) => (
                <EditableControl
                  key={d.key}
                  descriptor={d}
                  value={config?.[d.key]}
                  disabled={disabled}
                  onApply={apply}
                  tr={tr}
                />
              ))}
            </Box>
          </Box>
        ))}

        {/* --- Read-only table for everything else --- */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 0.5 }}>
          {tr('All other settings (read-only)', '其他所有设置（只读）')}
        </Typography>
        <Box sx={{ maxHeight: 320, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" stickyHeader>
            <TableBody>
              {entries.map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell sx={{ typography: 'subtitle2', fontWeight: 400, fontFamily: monospaceFontFamily, width: '45%', verticalAlign: 'top' }}>{k}</TableCell>
                  <TableCell sx={{ typography: 'subtitle2', fontWeight: 400, fontFamily: monospaceFontFamily, wordBreak: 'break-all' }}>{valueToText(v)}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={2}><Typography variant="body2" color="text.secondary">{tr('No configuration loaded.', '未加载配置。')}</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
          </>
        )}

        {tab === 'info' && (
          <ServerInfoPanel
            effectiveConfig={effectiveConfig}
            serverStatus={serverStatus}
            error={infoError}
            proxyConfig={proxyConfig}
            proxyError={proxyError}
            connectionParams={connectionParams}
            tr={tr}
            onPortsBound={(ports) => setServerStatus((s) => (s ? { ...s, ports } : { ports }))}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tr('Close', '关闭')}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Server Info tab — read-only effective configuration + bound ports
// ---------------------------------------------------------------------------

/** Preferred display order of the source tiers (ignored keys, then most specific override first). */
const SOURCE_ORDER = [
  'unrecognised',
  'runtime-set',
  'system-property',
  'environment-variable',
  'properties-file',
  'default',
] as const;

/** Group the effective config by source tier, in SOURCE_ORDER (unknowns last). */
function groupBySource(props: EffectiveConfigProperty[]): [string, EffectiveConfigProperty[]][] {
  const bySource = new Map<string, EffectiveConfigProperty[]>();
  for (const p of props) {
    const list = bySource.get(p.source);
    if (list) list.push(p);
    else bySource.set(p.source, [p]);
  }
  const ordered: [string, EffectiveConfigProperty[]][] = [];
  for (const source of SOURCE_ORDER) {
    const list = bySource.get(source);
    if (list) { ordered.push([source, list]); bySource.delete(source); }
  }
  // Any source not in the known order (forward-compat) appended in insertion order.
  for (const [source, list] of bySource) ordered.push([source, list]);
  return ordered;
}

function ServerInfoPanel({
  effectiveConfig,
  serverStatus,
  error,
  proxyConfig,
  proxyError,
  connectionParams,
  onPortsBound,
  tr,
}: {
  effectiveConfig: EffectiveConfigProperty[] | null;
  serverStatus: ServerStatus | null;
  error: HumanError | null;
  proxyConfig: ProxyConfiguration | null;
  proxyError: HumanError | null;
  connectionParams: ConnectionParams;
  onPortsBound: (ports: number[]) => void;
  tr: (en: string, zh: string) => string;
}) {
  const grouped = useMemo(
    () => (effectiveConfig ? groupBySource(effectiveConfig) : []),
    [effectiveConfig],
  );

  if (error) {
    return <HumanErrorAlert error={error} sx={{ mb: 1.5 }} />;
  }

  if (effectiveConfig === null) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        {tr('Loading server info…', '正在加载服务器信息…')}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {tr('The effective configuration this server resolved at startup, with the source of each value. Sensitive values are redacted by the server. This view is read-only.', '此处显示服务器启动时解析出的有效配置及每个值的来源。敏感值由服务器脱敏；此视图为只读。')}
      </Typography>

      {/* Bound ports + build info */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {tr('Bound ports', '已绑定端口')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
        {serverStatus && serverStatus.ports.length > 0 ? (
          serverStatus.ports.map((port) => (
            <Chip key={port} size="small" label={String(port)} variant="outlined" sx={{ fontFamily: monospaceFontFamily }} />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">{tr('No bound ports reported.', '未报告已绑定端口。')}</Typography>
        )}
      </Box>
      <BindPortControl connectionParams={connectionParams} onPortsBound={onPortsBound} tr={tr} />
      {serverStatus?.version && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 1.5 }}>
          {tr('Version', '版本')} {serverStatus.version}
          {serverStatus.gitHash ? ` (${serverStatus.gitHash})` : ''}
        </Typography>
      )}

      {/* Proxy setup */}
      <ProxySetupSection proxyConfig={proxyConfig} proxyError={proxyError} tr={tr} />

      {/* Effective configuration grouped by source tier */}
      {grouped.map(([source, props]) => (
        <Box key={source} sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
            {configText(CONFIG_SOURCE_LABELS[source] ?? source, tr)} ({props.length})
          </Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Table size="small">
              <TableBody>
                {props.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell sx={{ typography: 'subtitle2', fontWeight: 400, fontFamily: monospaceFontFamily, width: '55%', verticalAlign: 'top' }}>
                      {p.name}
                    </TableCell>
                    <TableCell sx={{ typography: 'subtitle2', fontWeight: 400, fontFamily: monospaceFontFamily, wordBreak: 'break-all' }}>
                      {p.value}
                      {p.suggestions && p.suggestions.length > 0 && tr(` did you mean ${p.suggestions.join(' or ')}?`, `，是否想输入 ${p.suggestions.join(' 或 ')}？`)}
                      {p.default !== undefined && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontFamily: monospaceFontFamily }}>
                          {tr(`(default: ${p.default})`, `（默认值：${p.default}）`)}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ))}
      {grouped.length === 0 && (
        <Typography variant="body2" color="text.secondary">{tr('No configuration reported.', '未报告配置。')}</Typography>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Bind additional port
// ---------------------------------------------------------------------------

function BindPortControl({
  connectionParams,
  onPortsBound,
  tr,
}: {
  connectionParams: ConnectionParams;
  onPortsBound: (ports: number[]) => void;
  tr: (en: string, zh: string) => string;
}) {
  const [port, setPort] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HumanError | null>(null);

  const bind = useCallback(async () => {
    const parsed = Number(port);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
      setError({ message: tr('Enter a valid port number (0–65535).', '请输入有效端口号（0–65535）。') });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ports = await bindAdditionalPort(connectionParams, parsed);
      onPortsBound(ports);
      setPort('');
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }, [port, connectionParams, onPortsBound, tr]);

  return (
    <Box sx={{ mt: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          type="number"
          label={tr('Bind additional port', '绑定额外端口')}
          value={port}
          disabled={busy}
          sx={{ width: 200 }}
          slotProps={{ htmlInput: { min: 0, max: 65535 } }}
          onChange={(e) => setPort(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void bind(); }}
        />
        <Button size="small" variant="outlined" disabled={busy || port.trim() === ''} onClick={() => void bind()}>
          {tr('Bind', '绑定')}
        </Button>
      </Box>
      {error && <HumanErrorAlert error={error} sx={{ mt: 1 }} />}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Proxy setup section
// ---------------------------------------------------------------------------

function ProxySetupSection({
  proxyConfig,
  proxyError,
  tr,
}: {
  proxyConfig: ProxyConfiguration | null;
  proxyError: HumanError | null;
  tr: (en: string, zh: string) => string;
}) {
  const downloadCa = useCallback(() => {
    if (!proxyConfig?.caCertificatePem) return;
    const blob = new Blob([proxyConfig.caCertificatePem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mockserver-ca.pem';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [proxyConfig]);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {tr('Proxy setup', '代理设置')}
      </Typography>
      {proxyError && <HumanErrorAlert error={proxyError} sx={{ mb: 1 }} />}
      {!proxyError && !proxyConfig && (
        <Typography variant="body2" color="text.secondary">{tr('Loading proxy setup…', '正在加载代理设置…')}</Typography>
      )}
      {proxyConfig && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {proxyConfig.warning && <HumanErrorAlert message={proxyConfig.warning} severity="warning" />}

          {/* HTTPS proxy URL */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {tr('HTTPS proxy URL', 'HTTPS 代理 URL')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontFamily: monospaceFontFamily, wordBreak: 'break-all' }}>
                {proxyConfig.httpsProxy || tr('(unavailable)', '（不可用）')}
              </Typography>
              {proxyConfig.httpsProxy && <CopyButton text={proxyConfig.httpsProxy} />}
            </Box>
          </Box>

          {/* Environment-variable snippets */}
          {([
            [tr('Unix / macOS shell', 'Unix / macOS Shell'), proxyConfig.environmentVariables.unix],
            ['PowerShell', proxyConfig.environmentVariables.powershell],
          ] as const).filter(([, snippet]) => snippet).map(([label, snippet]) => (
            <Box key={label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <CopyButton text={snippet} />
              </Box>
              <Box
                component="pre"
                sx={{
                  m: 0, p: 1, borderRadius: 1, border: 1, borderColor: 'divider',
                  fontFamily: monospaceFontFamily, fontSize: '0.72rem',
                  overflowX: 'auto', whiteSpace: 'pre', bgcolor: 'action.hover',
                }}
              >
                {snippet}
              </Box>
            </Box>
          ))}

          {/* CA certificate download */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {tr('CA certificate', 'CA 证书')} {proxyConfig.usingDefaultCa ? tr('(built-in default)', '（内置默认）') : tr('(custom)', '（自定义）')}
            </Typography>
            <Button size="small" variant="outlined" disabled={!proxyConfig.caCertificatePem} onClick={downloadCa}>
              {tr('Download CA (mockserver-ca.pem)', '下载 CA（mockserver-ca.pem）')}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Generic editable-control renderer driven by a single descriptor
// ---------------------------------------------------------------------------

function EditableControl({
  descriptor,
  value,
  disabled,
  onApply,
  tr,
}: {
  descriptor: EditablePropertyDescriptor;
  value: unknown;
  disabled: boolean;
  onApply: (partial: Configuration) => Promise<void>;
  tr: (en: string, zh: string) => string;
}) {
  const { key, label, type, help } = descriptor;

  if (type === 'boolean') {
    const checked = value === true;
    return (
      <Tooltip title={help} arrow>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={checked}
              disabled={disabled}
              onChange={(e) => void onApply({ [key]: e.target.checked })}
            />
          }
          label={<Typography variant="body2">{configText(label, tr)}</Typography>}
        />
      </Tooltip>
    );
  }

  if (type === 'number') {
    return <NumberField configKey={key} label={configText(label, tr)} help={configText(help, tr)} value={value} disabled={disabled} onApply={onApply} />;
  }

  // type === 'string'
  return <StringField configKey={key} label={configText(label, tr)} help={configText(help, tr)} value={value} disabled={disabled} onApply={onApply} />;
}

/**
 * Number field with local draft state.  Resets from the server value when the
 * prop changes (using the "store previous props" pattern — no useEffect needed).
 */
function NumberField({
  configKey, label, help, value, disabled, onApply,
}: {
  configKey: string; label: string; help: string; value: unknown;
  disabled: boolean; onApply: (partial: Configuration) => Promise<void>;
}) {
  const serverValue = typeof value === 'number' ? String(value) : '';
  const [prev, setPrev] = useState(serverValue);
  const [draft, setDraft] = useState(serverValue);

  // Reset draft when the server value changes (after a PUT + refresh).
  if (serverValue !== prev) {
    setPrev(serverValue);
    setDraft(serverValue);
  }

  const commit = useCallback(() => {
    if (draft.trim() === '') return;          // empty → don't PUT (Number('') === 0)
    const parsed = Number(draft);
    if (!Number.isNaN(parsed)) {
      void onApply({ [configKey]: parsed });
    }
  }, [draft, configKey, onApply]);

  return (
    <Tooltip title={help} arrow>
      <TextField
        size="small"
        type="number"
        label={label}
        value={draft}
        disabled={disabled}
        sx={{ width: 160 }}
        slotProps={{ htmlInput: { min: 0 } }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
    </Tooltip>
  );
}

/**
 * String text field with local draft state (same pattern as NumberField).
 */
function StringField({
  configKey, label, help, value, disabled, onApply,
}: {
  configKey: string; label: string; help: string; value: unknown;
  disabled: boolean; onApply: (partial: Configuration) => Promise<void>;
}) {
  const serverValue = typeof value === 'string' ? value : '';
  const [prev, setPrev] = useState(serverValue);
  const [draft, setDraft] = useState(serverValue);

  if (serverValue !== prev) {
    setPrev(serverValue);
    setDraft(serverValue);
  }

  const commit = useCallback(() => {
    void onApply({ [configKey]: draft });
  }, [draft, configKey, onApply]);

  return (
    <Tooltip title={help} arrow>
      <TextField
        size="small"
        label={label}
        value={draft}
        disabled={disabled}
        sx={{ minWidth: 240, flexGrow: 1 }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
    </Tooltip>
  );
}
