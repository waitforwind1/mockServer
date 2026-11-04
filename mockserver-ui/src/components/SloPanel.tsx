import { useCallback, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RuleIcon from '@mui/icons-material/Rule';
import { humanizeError } from '../lib/errorMessage';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { useI18n } from '../i18n';
import {
  verifySlo,
  COMPARATOR_SYMBOLS,
  SLI_LABELS,
  type SloComparator,
  type SloCriteria,
  type SloObjective,
  type SloResult,
  type SloSli,
  type SloVerdict,
} from '../lib/slo';

interface SloPanelProps {
  connectionParams: ConnectionParams;
}

const SLI_OPTIONS: SloSli[] = ['LATENCY_P50', 'LATENCY_P95', 'LATENCY_P99', 'ERROR_RATE'];
const COMPARATOR_OPTIONS: SloComparator[] = [
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
];

/** A single authored objective row. Threshold is held as a string for free editing. */
interface ObjectiveDraft {
  sli: SloSli;
  comparator: SloComparator;
  threshold: string;
}

const DEFAULT_OBJECTIVES: ObjectiveDraft[] = [
  { sli: 'LATENCY_P95', comparator: 'LESS_THAN', threshold: '250' },
  { sli: 'ERROR_RATE', comparator: 'LESS_THAN_OR_EQUAL', threshold: '0.01' },
];

/** Map an overall / per-objective result to an MUI colour. */
function resultColor(result: SloResult): 'success' | 'error' | 'warning' {
  switch (result) {
    case 'PASS':
      return 'success';
    case 'FAIL':
      return 'error';
    default:
      return 'warning';
  }
}

/** Map an overall result to an Alert severity. */
function resultSeverity(result: SloResult): 'success' | 'error' | 'warning' {
  return resultColor(result);
}

function formatObserved(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  // Latency values are whole-ish millis; error rates are small fractions. Show
  // enough precision for both without a wall of trailing zeros.
  return Math.abs(value) < 1 ? value.toFixed(4) : value.toFixed(1);
}

/** Format an epoch-millis instant for the evaluated-window caption. */
function formatInstant(epochMs: number): string {
  if (!epochMs || Number.isNaN(epochMs)) return '—';
  try {
    return new Date(epochMs).toLocaleString();
  } catch {
    return String(epochMs);
  }
}

export default function SloPanel({ connectionParams }: SloPanelProps) {
  const { tr } = useI18n();
  const [name, setName] = useState('checkout-slo');
  const [lookbackSeconds, setLookbackSeconds] = useState('60');
  const [minimumSampleCount, setMinimumSampleCount] = useState('1');
  const [upstreamHosts, setUpstreamHosts] = useState('');
  const [objectives, setObjectives] = useState<ObjectiveDraft[]>(DEFAULT_OBJECTIVES);
  const [verdict, setVerdict] = useState<SloVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateObjective = useCallback((index: number, patch: Partial<ObjectiveDraft>) => {
    setObjectives((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }, []);

  const addObjective = useCallback(() => {
    setObjectives((prev) => [...prev, { sli: 'LATENCY_P99', comparator: 'LESS_THAN', threshold: '500' }]);
  }, []);

  const removeObjective = useCallback((index: number) => {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleVerify = useCallback(() => {
    const lookbackMillis = Math.round((Number(lookbackSeconds) || 0) * 1000);
    const parsedObjectives: SloObjective[] = objectives.map((o) => ({
      sli: o.sli,
      comparator: o.comparator,
      threshold: Number(o.threshold),
      scope: 'FORWARD',
    }));
    const hosts = upstreamHosts
      .split(',')
      .map((h) => h.trim())
      .filter((h) => h.length > 0);
    const criteria: SloCriteria = {
      name: name.trim() || undefined,
      window: { type: 'LOOKBACK', lookbackMillis },
      objectives: parsedObjectives,
      minimumSampleCount: Number(minimumSampleCount) || 1,
      ...(hosts.length > 0 ? { upstreamHosts: hosts } : {}),
    };

    setBusy(true);
    setError(null);
    verifySlo(connectionParams, criteria)
      .then((v) => {
        setVerdict(v);
        setError(null);
      })
      .catch((e) => {
        setVerdict(null);
        setError(humanizeError(e).message);
      })
      .finally(() => setBusy(false));
  }, [connectionParams, name, lookbackSeconds, minimumSampleCount, upstreamHosts, objectives]);

  const canVerify =
    !busy &&
    // A zero/empty lookback would evaluate a 0ms window — always INCONCLUSIVE
    // with no samples — so block it rather than submit a guaranteed no-op.
    Number(lookbackSeconds) > 0 &&
    objectives.length > 0 &&
    objectives.every((o) => o.threshold.trim() !== '' && !Number.isNaN(Number(o.threshold)));

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {tr('SLO Verification', 'SLO 验证')}
        </Typography>
        {verdict && (
          <Chip
            size="small"
            label={verdict.result}
            color={resultColor(verdict.result)}
            variant="filled"
          />
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {tr('Assert service-level objectives against recorded forward/proxy traffic. Each objective compares an observed indicator (latency percentile or error rate) over a trailing window against a threshold; every objective must hold for the criteria to PASS. SLO tracking must be enabled on the server.', '根据已录制的转发/代理流量验证服务级别目标。每个目标会将滚动时间窗口内观测到的指标（延迟百分位数或错误率）与阈值比较；所有目标都满足时才会 PASS。服务器必须启用 SLO 跟踪。')} (<code>sloTrackingEnabled=true</code>)
      </Typography>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
          <TextField
            size="small"
            label={tr('Name', '名称')}
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            sx={{ width: 200 }}
          />
          <TextField
            size="small"
            type="number"
            label={tr('Lookback (seconds)', '回溯时长（秒）')}
            value={lookbackSeconds}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLookbackSeconds(e.target.value)}
            sx={{ width: 160 }}
            slotProps={{ htmlInput: { min: 0, 'aria-label': tr('Lookback window in seconds', '回溯窗口秒数') } }}
          />
          <TextField
            size="small"
            type="number"
            label={tr('Min samples', '最少样本数')}
            value={minimumSampleCount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMinimumSampleCount(e.target.value)}
            sx={{ width: 140 }}
            slotProps={{ htmlInput: { min: 1, 'aria-label': tr('Minimum sample count', '最少样本数') } }}
          />
          <TextField
            size="small"
            label={tr('Upstream hosts (optional)', '上游主机（可选）')}
            placeholder="payments.svc, orders.svc"
            value={upstreamHosts}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUpstreamHosts(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {tr('Objectives', '目标')}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{tr('Indicator', '指标')}</TableCell>
                <TableCell>{tr('Comparator', '比较符')}</TableCell>
                <TableCell>{tr('Threshold', '阈值')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {objectives.map((objective, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={objective.sli}
                      onChange={(e) => updateObjective(index, { sli: e.target.value as SloSli })}
                      sx={{ minWidth: 170 }}
                      slotProps={{ htmlInput: { 'aria-label': tr(`Objective ${index + 1} indicator`, `目标 ${index + 1} 指标`) } }}
                    >
                      {SLI_OPTIONS.map((sli) => (
                        <MenuItem key={sli} value={sli}>{SLI_LABELS[sli]}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={objective.comparator}
                      onChange={(e) => updateObjective(index, { comparator: e.target.value as SloComparator })}
                      sx={{ minWidth: 90 }}
                      slotProps={{ htmlInput: { 'aria-label': tr(`Objective ${index + 1} comparator`, `目标 ${index + 1} 比较符`) } }}
                    >
                      {COMPARATOR_OPTIONS.map((c) => (
                        <MenuItem key={c} value={c}>{COMPARATOR_SYMBOLS[c]}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={objective.threshold}
                      onChange={(e) => updateObjective(index, { threshold: e.target.value })}
                      sx={{ width: 120 }}
                      slotProps={{ htmlInput: { 'aria-label': tr(`Objective ${index + 1} threshold`, `目标 ${index + 1} 阈值`) } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={tr('Remove objective', '删除目标')}>
                      <span>
                        <IconButton
                          size="small"
                          aria-label={tr(`Remove objective ${index + 1}`, `删除目标 ${index + 1}`)}
                          disabled={objectives.length <= 1}
                          onClick={() => removeObjective(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={addObjective}>
            {tr('Add objective', '添加目标')}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            size="small"
            startIcon={<RuleIcon fontSize="small" />}
            disabled={!canVerify}
            onClick={handleVerify}
          >
            {busy ? tr('Verifying…', '正在验证…') : tr('Verify SLO', '验证 SLO')}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          <AlertTitle>{tr('Could not verify SLO', '无法验证 SLO')}</AlertTitle>
          {error}
        </Alert>
      )}

      {verdict && (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Alert severity={resultSeverity(verdict.result)} sx={{ mb: 1.5 }}>
            <AlertTitle>
              {verdict.name ? `${verdict.name}: ` : ''}{verdict.result}
            </AlertTitle>
            {tr(`Evaluated ${verdict.sampleCount} sample${verdict.sampleCount === 1 ? '' : 's'} over the window.`, `在该窗口内评估了 ${verdict.sampleCount} 个样本。`)}
            {verdict.result === 'INCONCLUSIVE' && tr(' Not enough samples to draw a verdict — generate traffic and try again.', ' 样本不足，无法得出结论 — 请生成流量后重试。')}
          </Alert>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {tr('Evaluated window', '评估窗口')}：{formatInstant(verdict.windowFromEpochMillis)} – {formatInstant(verdict.windowToEpochMillis)}
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{tr('Indicator', '指标')}</TableCell>
                  <TableCell>{tr('Objective', '目标')}</TableCell>
                  <TableCell align="right">{tr('Observed', '观测值')}</TableCell>
                  <TableCell>{tr('Result', '结果')}</TableCell>
                  <TableCell>{tr('Detail', '详情')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {verdict.objectiveResults.map((objectiveResult, index) => (
                  <TableRow key={`${objectiveResult.sli}-${index}`}>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {SLI_LABELS[objectiveResult.sli] ?? objectiveResult.sli}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {COMPARATOR_SYMBOLS[objectiveResult.comparator] ?? objectiveResult.comparator}{' '}
                        {objectiveResult.threshold}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {formatObserved(objectiveResult.observedValue)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={objectiveResult.result}
                        color={resultColor(objectiveResult.result)}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {objectiveResult.detail ?? ''}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
