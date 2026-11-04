import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { useDashboardStore } from '../store';
import { useAutoLoadLlmRows } from '../hooks/useLoadFullRow';
import {
  aggregateMcpServerHealth,
  MCP_SLOW_THRESHOLD_MS,
  type McpServerHealth,
} from '../lib/llmTraffic';
import { monospaceFontFamily } from '../theme';
import { combineTraffic } from '../lib/combineTraffic';
import { useI18n } from '../i18n';

// ---------------------------------------------------------------------------
// MCP server health panel
//
// Surfaces per-MCP-server health for proxied coding-assistant CLI traffic so a
// user can SEE which MCP server (chrome-devtools, devbot, …) is slow or erroring
// — the MCP server is frequently the real bottleneck while MockServer's own part
// is fast. Data is derived client-side from captured traffic in the store via
// the pure `aggregateMcpServerHealth` helper (see lib/llmTraffic.ts).
// ---------------------------------------------------------------------------

/** Render a latency value in ms/s, or an em dash when absent. */
function formatLatency(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}

function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${Math.round(ratio * 100)}%`;
}

function HealthRow({ row }: { row: McpServerHealth }) {
  const { tr } = useI18n();
  const hasErrors = row.errorCount > 0;
  // Match the Traffic view idiom: errors read as `error`, slow-but-clean reads as
  // `warning`. The flagged background is a translucent tint of the same palette.
  const tint = hasErrors ? 'error' : row.slow ? 'warning' : null;
  return (
    <TableRow
      hover
      sx={
        tint
          ? { bgcolor: (t) => `${t.palette[tint].main}14` }
          : undefined
      }
    >
      <TableCell sx={{ fontFamily: monospaceFontFamily, fontSize: '0.72rem' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {row.server}
          {hasErrors && (
            <Chip size="small" color="error" label={tr('errors', '错误')} sx={{ height: 18, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }} />
          )}
          {!hasErrors && row.slow && (
            <Chip size="small" color="warning" label={tr('slow', '缓慢')} sx={{ height: 18, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }} />
          )}
        </Box>
      </TableCell>
      <TableCell align="right">
        <Typography
          component="span"
          variant="body2"
          sx={{ color: hasErrors ? 'error.main' : 'text.primary', fontWeight: hasErrors ? 600 : 400 }}
        >
          {formatPercent(row.errorRate)}
        </Typography>
      </TableCell>
      <TableCell align="right">{formatLatency(row.medianLatencyMs)}</TableCell>
      <TableCell align="right">{formatLatency(row.p95LatencyMs)}</TableCell>
      <TableCell align="right">
        <Typography
          component="span"
          variant="body2"
          sx={{ color: row.slow ? 'warning.main' : 'text.primary', fontWeight: row.slow ? 600 : 400 }}
        >
          {formatLatency(row.maxLatencyMs)}
        </Typography>
      </TableCell>
      <TableCell sx={{ fontFamily: monospaceFontFamily, fontSize: '0.72rem' }}>
        {row.slowestMethod ?? '—'}
      </TableCell>
    </TableRow>
  );
}

export default function McpServerHealthPanel() {
  const { tr } = useI18n();
  const proxiedRequests = useDashboardStore((s) => s.proxiedRequests);
  const recordedRequests = useDashboardStore((s) => s.recordedRequests);
  useAutoLoadLlmRows();

  const rows = useMemo(() => {
    const values = combineTraffic(proxiedRequests, recordedRequests).map((item) => item.value);
    return aggregateMcpServerHealth(values);
  }, [proxiedRequests, recordedRequests]);

  return (
    <Box sx={{ p: 2, overflow: 'auto' }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {tr('MCP Server Health', 'MCP 服务器健康状态')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        {tr(
          `Per-server latency and error rate for MCP servers your proxied tools call. When a coding-assistant CLI feels slow, the MCP server is often the real bottleneck — servers flagged slow (p95 or max at/over ${(MCP_SLOW_THRESHOLD_MS / 1000).toFixed(0)} s) or with errors are shown worst-first.`,
          `显示代理工具所调用的各 MCP 服务器的延迟和错误率。当编码助手 CLI 响应缓慢时，真正的瓶颈往往是 MCP 服务器；标记为缓慢（p95 或最大延迟达到或超过 ${(MCP_SLOW_THRESHOLD_MS / 1000).toFixed(0)} 秒）或有错误的服务器会按最差优先排列。`,
        )}
      </Typography>

      {rows.length === 0 ? (
        <Alert severity="info" data-testid="mcp-health-empty">
          {tr('No MCP traffic captured. Proxy a tool that talks to MCP servers (JSON-RPC over HTTP) and its per-server health will appear here.', '尚未捕获 MCP 流量。请代理一个通过 HTTP 上的 JSON-RPC 与 MCP 服务器通信的工具，随后这里会显示各服务器的健康状态。')}
        </Alert>
      ) : (
        <Paper variant="outlined">
          <Table size="small" aria-label={tr('MCP server health', 'MCP 服务器健康状态')} data-testid="mcp-health-table">
            <TableHead>
              <TableRow>
                {/* No Calls column: this aggregates the capped live window, so a count
                    sums to at most the cap however much traffic ran. The rates and
                    percentiles are ratios over that sample and remain meaningful. */}
                <TableCell>{tr('Server', '服务器')}</TableCell>
                <TableCell align="right">{tr('Errors', '错误率')}</TableCell>
                <TableCell align="right">{tr('Median', '中位数')}</TableCell>
                <TableCell align="right">p95</TableCell>
                <TableCell align="right">{tr('Max', '最大值')}</TableCell>
                <TableCell>{tr('Slowest method', '最慢方法')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <HealthRow key={row.server} row={row} />
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
