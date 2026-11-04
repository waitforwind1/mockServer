import { useCallback, useState, type ChangeEvent, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HumanErrorAlert from './HumanErrorAlert';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { useI18n } from '../i18n';
import {
  runContractTest,
  validateRecordedTraffic,
  type ContractTestReport,
  type ContractTestOperationResult,
  type TrafficValidationReport,
  type TrafficValidationResult,
} from '../lib/contractTest';

interface ContractTestPanelProps {
  connectionParams: ConnectionParams;
}

type Mode = 'live' | 'traffic';

/** Renders a bulleted list of validation errors, or an em dash when there are none. */
function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Box component="ul" sx={{ m: 0, pl: 2 }}>
      {errors.map((err, j) => (
        <Typography
          key={j}
          component="li"
          variant="caption"
          color="error"
          sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
        >
          {err}
        </Typography>
      ))}
    </Box>
  );
}

/** A PASS / FAIL chip in the shared result-table style. */
function ResultChip({ passed }: { passed: boolean }) {
  const { tr } = useI18n();
  return passed ? (
    <Chip
      size="small"
      icon={<CheckCircleIcon fontSize="small" />}
      label={tr('PASS', '通过')}
      color="success"
      variant="outlined"
      sx={{ height: 22, fontSize: '0.65rem' }}
    />
  ) : (
    <Chip
      size="small"
      icon={<CancelIcon fontSize="small" />}
      label={tr('FAIL', '失败')}
      color="error"
      variant="outlined"
      sx={{ height: 22, fontSize: '0.65rem' }}
    />
  );
}

export default function ContractTestPanel({ connectionParams }: ContractTestPanelProps) {
  const { tr } = useI18n();
  const [mode, setMode] = useState<Mode>('live');
  const [spec, setSpec] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [operationId, setOperationId] = useState('');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ContractTestReport | null>(null);
  const [trafficReport, setTrafficReport] = useState<TrafficValidationReport | null>(null);
  const [error, setError] = useState<HumanError | null>(null);

  const canRun =
    !running &&
    spec.trim().length > 0 &&
    (mode === 'live' ? baseUrl.trim().length > 0 : true);

  const handleModeChange = useCallback((_e: MouseEvent<HTMLElement>, next: Mode | null) => {
    if (next === null) return;
    setMode(next);
    setReport(null);
    setTrafficReport(null);
    setError(null);
  }, []);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    setTrafficReport(null);
    try {
      if (mode === 'live') {
        const result = await runContractTest(connectionParams, {
          spec: spec.trim(),
          baseUrl: baseUrl.trim(),
          operationId: operationId.trim() || undefined,
        });
        setReport(result);
      } else {
        const result = await validateRecordedTraffic(connectionParams, { spec: spec.trim() });
        setTrafficReport(result);
      }
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setRunning(false);
    }
  }, [connectionParams, mode, spec, baseUrl, operationId]);

  const headingChip = (() => {
    if (mode === 'live' && report) {
      return (
        <Chip
          size="small"
          label={report.allPassed ? tr('All passed', '全部通过') : tr(`${report.failed} failed`, `${report.failed} 个失败`)}
          color={report.allPassed ? 'success' : 'error'}
          variant="outlined"
        />
      );
    }
    if (mode === 'traffic' && trafficReport && trafficReport.totalRequests > 0) {
      return (
        <Chip
          size="small"
          label={trafficReport.allPassed ? tr('All valid', '全部有效') : tr(`${trafficReport.failed} invalid`, `${trafficReport.failed} 个无效`)}
          color={trafficReport.allPassed ? 'success' : 'error'}
          variant="outlined"
        />
      );
    }
    return null;
  })();

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {tr('Contract Test', '契约测试')}
        </Typography>
        {headingChip}
      </Box>

      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        onChange={handleModeChange}
        aria-label={tr('Contract mode', '契约模式')}
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="live">{tr('Live Contract Test', '实时契约测试')}</ToggleButton>
        <ToggleButton value="traffic">{tr('Validate Recorded Traffic', '验证已录制流量')}</ToggleButton>
      </ToggleButtonGroup>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {mode === 'live'
          ? tr("Run an OpenAPI spec's operations against a live service and validate every response against the spec. Supply the spec as a URL, file path, or inline document.", '针对实时服务运行 OpenAPI 规范中的操作，并根据规范验证每个响应。规范可使用 URL、文件路径或内联文档。')
          : tr('Validate the traffic MockServer has already recorded against an OpenAPI spec — no live service is contacted. Every recorded request and response is checked against the spec. Supply the spec as a URL, file path, or inline document.', '根据 OpenAPI 规范验证 MockServer 已录制的流量，不会联系实时服务。每个录制的请求和响应都会根据规范检查。规范可使用 URL、文件路径或内联文档。')}
      </Typography>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label={tr('OpenAPI spec (URL or inline)', 'OpenAPI 规范（URL 或内联内容）')}
            placeholder={tr('https://example.com/openapi.json  —  or paste the spec here', 'https://example.com/openapi.json  —  或在此粘贴规范')}
            value={spec}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSpec(e.target.value)}
            multiline
            minRows={2}
            maxRows={10}
            fullWidth
            size="small"
          />
          {mode === 'live' && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <TextField
                label={tr('Target base URL', '目标基础 URL')}
                placeholder="http://localhost:8080"
                value={baseUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
                size="small"
                sx={{ flex: '1 1 280px' }}
              />
              <TextField
                label={tr('operationId (optional)', 'operationId（可选）')}
                placeholder={tr('all operations if blank', '留空表示所有操作')}
                value={operationId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setOperationId(e.target.value)}
                size="small"
                sx={{ flex: '1 1 220px' }}
              />
            </Box>
          )}
          <Box>
            <Tooltip
              title={
                canRun
                  ? mode === 'live'
                    ? tr('Run the contract test', '运行契约测试')
                    : tr('Validate the recorded traffic', '验证已录制流量')
                  : mode === 'live'
                    ? tr('A spec and a target base URL are required', '必须提供规范和目标基础 URL')
                    : tr('A spec is required', '必须提供规范')
              }
            >
              <span>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!canRun}
                  startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon fontSize="small" />}
                  onClick={() => { void handleRun(); }}
                >
                  {mode === 'live'
                    ? (running ? tr('Running…', '正在运行…') : tr('Run contract test', '运行契约测试'))
                    : (running ? tr('Validating…', '正在验证…') : tr('Validate Traffic', '验证流量'))}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {error !== null && <HumanErrorAlert error={error} sx={{ mb: 1.5 }} />}

      {mode === 'live' && report && (
        <Paper variant="outlined" sx={{ p: 1.25 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {report.baseUrl}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Chip size="small" variant="outlined" label={tr(`${report.totalOperations} operation${report.totalOperations === 1 ? '' : 's'}`, `${report.totalOperations} 个操作`)} />
            <Chip size="small" color="success" variant="outlined" label={tr(`${report.passed} passed`, `${report.passed} 个通过`)} />
            <Chip
              size="small"
              color={report.failed > 0 ? 'error' : 'default'}
              variant="outlined"
              label={tr(`${report.failed} failed`, `${report.failed} 个失败`)}
            />
          </Box>

          {report.results.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              {tr('The spec produced no testable operations.', '该规范没有生成可测试的操作。')}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{tr('Result', '结果')}</TableCell>
                    <TableCell>{tr('Operation', '操作')}</TableCell>
                    <TableCell>{tr('Method', '请求方法')}</TableCell>
                    <TableCell>{tr('Path', '路径')}</TableCell>
                    <TableCell align="right">{tr('Status', '状态')}</TableCell>
                    <TableCell>{tr('Validation errors', '验证错误')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.results.map((result: ContractTestOperationResult, i: number) => (
                    <TableRow key={`${result.operationId}-${result.method}-${result.path}-${i}`}>
                      <TableCell>
                        <ResultChip passed={result.passed} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {result.operationId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {result.method}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {result.path}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption">
                          {result.statusCodeReceived}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <ErrorList errors={result.validationErrors} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {mode === 'traffic' && trafficReport && (
        trafficReport.totalRequests === 0 ? (
          <Alert severity="info">
            {tr('No recorded traffic to validate. Send some requests through MockServer (record or proxy traffic) and run again.', '没有可验证的录制流量。请通过 MockServer 发送一些请求（录制或代理流量），然后重新运行。')}
          </Alert>
        ) : (
          <Paper variant="outlined" sx={{ p: 1.25 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.25 }}>
              <Box sx={{ flex: 1 }} />
              <Chip size="small" variant="outlined" label={tr(`${trafficReport.totalRequests} request${trafficReport.totalRequests === 1 ? '' : 's'}`, `${trafficReport.totalRequests} 个请求`)} />
              <Chip size="small" color="success" variant="outlined" label={tr(`${trafficReport.passed} passed`, `${trafficReport.passed} 个通过`)} />
              <Chip
                size="small"
                color={trafficReport.failed > 0 ? 'error' : 'default'}
                variant="outlined"
                label={tr(`${trafficReport.failed} failed`, `${trafficReport.failed} 个失败`)}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{tr('Result', '结果')}</TableCell>
                    <TableCell>{tr('Method', '请求方法')}</TableCell>
                    <TableCell>{tr('Path', '路径')}</TableCell>
                    <TableCell>{tr('Operation', '操作')}</TableCell>
                    <TableCell>{tr('Request errors', '请求错误')}</TableCell>
                    <TableCell>{tr('Response errors', '响应错误')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trafficReport.results.map((result: TrafficValidationResult, i: number) => (
                    <TableRow key={`${result.method}-${result.path}-${i}`}>
                      <TableCell>
                        <ResultChip passed={result.passed} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {result.method}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {result.path}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {result.matchedOperation ? result.matchedOperation : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <ErrorList errors={result.requestErrors} />
                      </TableCell>
                      <TableCell>
                        <ErrorList errors={result.responseErrors} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )
      )}
    </Box>
  );
}
