import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import HubIcon from '@mui/icons-material/Hub';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { getAsyncApiStatus, AsyncApiUnavailableError } from '../lib/asyncApi';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { humanizeError } from '../lib/errorMessage';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';

interface AsyncApiPanelProps {
  connectionParams: ConnectionParams;
}

interface AsyncApiChannel {
  name: string;
  hasSchema?: boolean;
  exampleCount?: number;
}

interface RecordedMessageEntry {
  channel: string;
  key?: string | null;
  payload: string;
  headers?: Record<string, string>;
  timestamp?: string;
  schemaValid?: boolean;
}

interface AsyncApiStatus {
  loaded: boolean;
  specTitle?: string;
  specVersion?: string;
  channels?: AsyncApiChannel[];
  publishers?: number;
  subscribers?: number;
  recordedMessages?: RecordedMessageEntry[];
}

const POLL_INTERVAL_MS = 5000;

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

function truncatePayload(payload: string, maxLength = 120): string {
  if (payload.length <= maxLength) return payload;
  return payload.substring(0, maxLength) + '...';
}

export default function AsyncApiPanel({ connectionParams }: AsyncApiPanelProps) {
  const { tr } = useI18n();
  const [status, setStatus] = useState<AsyncApiStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  // Auto-refresh the read-only broker status + recorded-message feed.
  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getAsyncApiStatus(connectionParams, signal);
      setUnavailable(false);
      setUnavailableMessage(null);
      setStatus(result as unknown as AsyncApiStatus);
      setLoadError(null);
    } catch (e) {
      if (signal?.aborted) return;
      if (e instanceof AsyncApiUnavailableError) {
        // the server's 501 names the artifact and where to get it; show that, not a local summary
        setUnavailable(true);
        setUnavailableMessage(e.message);
        setStatus(null);
        setLoadError(null);
        return;
      }
      setLoadError(humanizeError(e).message);
    }
  }, [connectionParams]);

  useAutoRefresh(loadStatus, { intervalMs: POLL_INTERVAL_MS });

  // Manual force-refresh (the existing Refresh button) — same fetch, off-cycle.
  const refresh = useCallback(() => {
    void loadStatus();
  }, [loadStatus]);

  const channels = status?.channels ?? [];
  const recordedMessages = useMemo(() => status?.recordedMessages ?? [], [status]);

  const filteredMessages = useMemo(() => {
    if (!filterText.trim()) return recordedMessages;
    const lower = filterText.toLowerCase();
    return recordedMessages.filter(
      (m) =>
        m.channel.toLowerCase().includes(lower) ||
        m.payload.toLowerCase().includes(lower) ||
        (m.key && m.key.toLowerCase().includes(lower)),
    );
  }, [recordedMessages, filterText]);

  // A loaded spec is not a broker connection: only a publisher or subscriber
  // means MockServer is actually attached to a broker.
  const brokerAttached = (status?.publishers ?? 0) + (status?.subscribers ?? 0) > 0;
  const connectionColor: 'success' | 'warning' | 'error' | 'default' = unavailable
    ? 'error'
    : status?.loaded && brokerAttached
      ? 'success'
      : 'default';

  const connectionLabel = unavailable
    ? tr('unavailable', '不可用')
    : status?.loaded
      ? brokerAttached
        ? tr('broker connected', 'Broker 已连接')
        : tr('spec loaded, no broker', '规范已加载，未连接 Broker')
      : tr('no spec loaded', '未加载规范');

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <HubIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {tr('AsyncAPI Broker Mock', 'AsyncAPI Broker 模拟')}
        </Typography>
        <Chip
          size="small"
          label={connectionLabel}
          color={connectionColor}
          variant="outlined"
        />
        {status?.loaded && status.specTitle && (
          <Chip
            size="small"
            label={status.specVersion ? `${status.specTitle} · AsyncAPI ${status.specVersion}` : status.specTitle}
            variant="outlined"
          />
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={tr('Refresh now', '立即刷新')}>
          <IconButton size="small" onClick={refresh} aria-label={tr('Refresh async status', '刷新 AsyncAPI 状态')}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {tr('Live status of the AsyncAPI broker mock — loaded spec, active channels, and messages recorded from broker subscriptions. Load a spec via the Tools menu or the PUT /mockserver/asyncapi endpoint.', 'AsyncAPI Broker 模拟的实时状态，包括已加载规范、活动 Channel，以及从 Broker 订阅中记录的消息。可通过工具菜单或 PUT /mockserver/asyncapi 端点加载规范。')}
      </Typography>

      {unavailable && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          <AlertTitle>{tr('Module Unavailable', '模块不可用')}</AlertTitle>
          {unavailableMessage ??
            tr("The AsyncAPI module (mockserver-async) is not on this server's classpath. Broker mocking requires the mockserver-async jar.", '此服务器的 classpath 中没有 AsyncAPI 模块（mockserver-async）。Broker 模拟需要 mockserver-async jar。')}
        </Alert>
      )}

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          action={
            <IconButton color="inherit" size="small" onClick={refresh} aria-label={tr('Retry', '重试')}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          }
        >
          <AlertTitle>{tr('Could not load async status', '无法加载 AsyncAPI 状态')}</AlertTitle>
          {loadError}
        </Alert>
      )}

      {/* Channels table */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {tr('Channels', 'Channel')}
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.25, mb: 2 }}>
        {channels.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            {tr('No channels loaded. Load an AsyncAPI spec to start mocking broker channels.', '尚未加载 Channel。请加载 AsyncAPI 规范以开始模拟 Broker Channel。')}
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{tr('Channel / Topic', 'Channel / Topic')}</TableCell>
                  <TableCell align="center">{tr('Schema', 'Schema')}</TableCell>
                  <TableCell align="right">{tr('Examples', '示例')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channels.map((ch) => (
                  <TableRow key={ch.name}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: monospaceFontFamily }}>
                        {ch.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {ch.hasSchema ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <ErrorOutlinedIcon fontSize="small" color="disabled" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{ch.exampleCount ?? 0}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Publisher/subscriber summary */}
      {status?.loaded && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <Chip
            size="small"
            label={tr(`${status.publishers ?? 0} publisher(s)`, `${status.publishers ?? 0} 个发布者`)}
            variant="outlined"
          />
          <Chip
            size="small"
            label={tr(`${status.subscribers ?? 0} subscriber(s)`, `${status.subscribers ?? 0} 个订阅者`)}
            variant="outlined"
          />
          <Chip
            size="small"
            label={tr(`${recordedMessages.length} recorded message(s)`, `${recordedMessages.length} 条已记录消息`)}
            color={recordedMessages.length > 0 ? 'info' : 'default'}
            variant="outlined"
          />
        </Box>
      )}

      {/* Recorded messages */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {tr('Recorded Messages', '已记录消息')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          label={tr('Filter', '筛选')}
          placeholder={tr('channel, key, or payload...', 'Channel、Key 或 Payload…')}
          value={filterText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
          sx={{ width: { xs: 140, sm: 220 } }}
        />
      </Box>
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        {filteredMessages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            {status?.loaded
              ? tr('No messages recorded yet. Enable consumers with "consume": true in your brokerConfig, then publish messages to see them here.', '尚未记录消息。请在 brokerConfig 中使用 "consume": true 启用消费者，然后发布消息以在此查看。')
              : tr('Load an AsyncAPI spec with consumer subscriptions to see recorded messages.', '请加载包含消费者订阅的 AsyncAPI 规范以查看记录的消息。')}
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{tr('Channel', 'Channel')}</TableCell>
                  <TableCell>{tr('Key', 'Key')}</TableCell>
                  <TableCell>{tr('Payload', 'Payload')}</TableCell>
                  <TableCell align="center">{tr('Valid', '有效')}</TableCell>
                  <TableCell>{tr('Time', '时间')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMessages.map((msg, i) => (
                  <TableRow key={`${msg.channel}-${msg.timestamp ?? i}-${i}`}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: monospaceFontFamily }}>
                        {msg.channel}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: monospaceFontFamily }}>
                        {msg.key ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={msg.payload}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: monospaceFontFamily,
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {truncatePayload(msg.payload)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      {msg.schemaValid === true && (
                        <CheckCircleIcon fontSize="small" color="success" />
                      )}
                      {msg.schemaValid === false && (
                        <ErrorOutlinedIcon fontSize="small" color="error" />
                      )}
                      {msg.schemaValid == null && (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(msg.timestamp)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
