import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { useDashboardStore } from '../store';
import { useLoadFullRow, notifyFullBodyLoadFailed } from '../hooks/useLoadFullRow';
import {
  testTemplate,
  templateExcerpt,
  expandTabs,
  caretOffset,
  recordedRequestOf,
  TemplateTestRefused,
  type TemplateTestActionType,
  type TemplateTestEngine,
  type TemplateTestReport,
} from '../lib/templateTest';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import { isNonHttpRequest } from '../lib/requestKind';
import { monospaceFontFamily } from '../theme';
import HumanErrorAlert from './HumanErrorAlert';
import JsonViewer from './JsonViewer';
import { useI18n } from '../i18n';

const DEFAULT_SAMPLE = '{\n  "method": "GET",\n  "path": "/"\n}';
const DEFAULT_KEY = '__default__';
const MAX_LISTED_REQUESTS = 50;

const ENGINE_LABELS: Record<TemplateTestEngine, string> = {
  VELOCITY: 'Velocity',
  MUSTACHE: 'Mustache',
  JAVASCRIPT: 'JavaScript',
};

function truncatedNote(truncated: boolean | undefined, tr: ReturnType<typeof useI18n>['tr']) {
  return truncated ? tr(' (shortened by the server)', '（已被服务器缩短）') : '';
}

function position(line: number | undefined, column: number | undefined, tr: ReturnType<typeof useI18n>['tr']): string | null {
  if (line === undefined) return null;
  return column !== undefined ? tr(`line ${line}, column ${column}`, `第 ${line} 行，第 ${column} 列`) : tr(`line ${line}`, `第 ${line} 行`);
}

function ErrorExcerpt({ template, templateType, line, column }: { template: string; templateType: TemplateTestEngine; line: number; column?: number }) {
  const { tr } = useI18n();
  const lines = templateExcerpt(template, line);
  if (lines.length === 0) return null;
  const width = String(lines[lines.length - 1]?.number ?? line).length;
  return (
    <Box
      component="pre"
      data-testid="template-error-excerpt"
      sx={{ m: 0, mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1, overflowX: 'auto', fontFamily: monospaceFontFamily, fontSize: '0.75rem' }}
    >
      {lines.map((l) => (
        <Box key={l.number} component="span" sx={{ display: 'block', color: l.failing ? 'error.main' : 'text.secondary', fontWeight: l.failing ? 600 : 400 }}>
          {`${l.failing ? '>' : ' '} ${String(l.number).padStart(width)} | ${expandTabs(l.text)}`}
          {l.failing && column !== undefined && column >= 1 && (
            <Box component="span" role="note" aria-label={tr(`error at column ${column}`, `错误位于第 ${column} 列`)} sx={{ display: 'block' }}>
              {`  ${' '.repeat(width)} | ${' '.repeat(caretOffset(l.text, column, templateType))}^`}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

function Result({ report, template, templateType, actionType }: { report: TemplateTestReport; template: string; templateType: TemplateTestEngine; actionType: TemplateTestActionType }) {
  const { tr } = useI18n();
  const rendered = report.renderedResponse ?? report.renderedRequest;
  const error = report.error;
  const errorPosition = error ? position(error.line, error.column, tr) : null;
  return (
    <Box data-testid="template-test-result" sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        {report.timedOut
          ? <Chip color="warning" label={tr('Timed Out', '已超时')} />
          : report.valid
            ? <Chip color="success" label={actionType === 'FORWARD_TEMPLATE' ? tr('Valid Request', '请求有效') : tr('Valid Response', '响应有效')} />
            : <Chip color="error" label={tr('Failed', '失败')} />}
        {report.durationMillis !== undefined && (
          <Typography variant="caption" color="text.secondary">{report.durationMillis} ms</Typography>
        )}
      </Box>

      {error && (
        <Alert severity={report.timedOut ? 'warning' : 'error'} sx={{ mb: 1, '& .MuiAlert-message': { minWidth: 0, flex: 1 } }}>
          {errorPosition && (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{tr('At template', '模板位置：')} {errorPosition}</Typography>
          )}
          {error.message && (
            <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: monospaceFontFamily, fontSize: '0.75rem' }}>
              {error.message}{truncatedNote(error.messageTruncated, tr)}
            </Typography>
          )}
          {error.hint && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>{tr('Hint:', '提示：')} {error.hint}{truncatedNote(error.hintTruncated, tr)}</Typography>
          )}
          {error.validationErrors && (
            <Typography variant="body2" component="div" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {tr(`Not a valid ${actionType === 'FORWARD_TEMPLATE' ? 'request' : 'response'}:`, `不是有效的${actionType === 'FORWARD_TEMPLATE' ? '请求' : '响应'}：`)} {error.validationErrors}{truncatedNote(error.validationErrorsTruncated, tr)}
            </Typography>
          )}
          {error.line !== undefined && <ErrorExcerpt template={template} templateType={templateType} line={error.line} column={error.column} />}
        </Alert>
      )}

      {report.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{tr(`Warnings (${report.warnings.length})`, `警告（${report.warnings.length}）`)}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {report.warnings.map((w, i) => {
              const at = position(w.line, w.column, tr);
              return (
                <li key={i} data-testid="template-test-warning">
                  <Typography variant="body2" component="span" sx={{ wordBreak: 'break-word' }}>
                    {at ? `${at}: ` : ''}{w.message}{truncatedNote(w.messageTruncated, tr)}
                  </Typography>
                </li>
              );
            })}
          </Box>
        </Alert>
      )}

      {rendered && (
        <Box>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
            {report.renderedRequest ? tr('Rendered Request', '渲染后的请求') : tr('Rendered Response', '渲染后的响应')}
          </Typography>
          <JsonViewer data={rendered} collapsed={3} />
        </Box>
      )}
      {!rendered && report.renderedOutput !== undefined && (
        <Box>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
            {tr('Rendered Output', '渲染输出')}{truncatedNote(report.renderedOutputTruncated, tr)}
          </Typography>
          <Box
            component="pre"
            data-testid="template-rendered-output"
            sx={{ m: 0, p: 1, bgcolor: 'action.hover', borderRadius: 1, overflow: 'auto', maxHeight: 320, fontFamily: monospaceFontFamily, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {report.renderedOutput}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * "Test Template": renders the editor's response or forward template against a recorded (or
 * hand-written) request with PUT /mockserver/template/test, without registering anything, and shows
 * the output, the failure position and any warnings.
 */
export default function TemplateTestDialog({
  open,
  onClose,
  connectionParams,
  templateType,
  template,
  actionType,
}: {
  open: boolean;
  onClose: () => void;
  connectionParams: ConnectionParams;
  templateType: TemplateTestEngine;
  template: string;
  actionType: TemplateTestActionType;
}) {
  const { tr } = useI18n();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const recordedRequests = useDashboardStore((s) => s.recordedRequests);
  const loadFullRow = useLoadFullRow();
  const [selectedKey, setSelectedKey] = useState(DEFAULT_KEY);
  const [requestText, setRequestText] = useState(DEFAULT_SAMPLE);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loadingRow, setLoadingRow] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TemplateTestReport | null>(null);
  const [failure, setFailure] = useState<{ error: HumanError; severity: 'error' | 'warning' } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);
  const close = useCallback(() => {
    cancel();
    onClose();
  }, [cancel, onClose]);

  const options = useMemo(
    () => recordedRequests
      .map((item) => ({ item, request: recordedRequestOf(item.value) }))
      .filter((o): o is { item: typeof o.item; request: Record<string, unknown> } => o.request !== undefined && !isNonHttpRequest(o.request))
      .slice(0, MAX_LISTED_REQUESTS),
    [recordedRequests],
  );

  const chooseRequest = useCallback(async (key: string) => {
    if (key === DEFAULT_KEY) {
      setSelectedKey(key);
      setRequestError(null);
      setRequestText(DEFAULT_SAMPLE);
      return;
    }
    const option = options.find((o) => o.item.key === key);
    if (!option) return;
    setLoadingRow(true);
    try {
      const whole = await loadFullRow(option.item);
      setSelectedKey(key);
      setRequestError(null);
      setRequestText(JSON.stringify(recordedRequestOf(whole.value) ?? option.request, null, 2));
    } catch (e) {
      notifyFullBodyLoadFailed(e);
    } finally {
      setLoadingRow(false);
    }
  }, [options, loadFullRow]);

  const run = useCallback(async () => {
    let request: Record<string, unknown> | undefined;
    if (requestText.trim()) {
      try {
        const parsed = JSON.parse(requestText) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setRequestError(tr('The sample request must be a JSON object', '示例请求必须是 JSON 对象'));
          return;
        }
        request = parsed as Record<string, unknown>;
      } catch (e) {
        setRequestError(e instanceof Error ? e.message : tr('Invalid JSON', 'JSON 无效'));
        return;
      }
    }
    setRequestError(null);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    setReport(null);
    setFailure(null);
    try {
      const next = await testTemplate(connectionParams, { templateType, template, actionType, request }, controller.signal);
      if (!controller.signal.aborted) setReport(next);
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof TemplateTestRefused) {
        setFailure({ error: { message: e.message }, severity: e.status === 429 ? 'warning' : 'error' });
      } else {
        setFailure({ error: humanizeError(e), severity: 'error' });
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setRunning(false);
      }
    }
  }, [requestText, connectionParams, templateType, template, actionType]);

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth fullScreen={fullScreen} aria-labelledby="template-test-dialog-title">
      <DialogTitle id="template-test-dialog-title">
        {tr('Test Template', '测试模板')}
        <Chip size="small" variant="outlined" sx={{ ml: 1 }} label={tr(`${ENGINE_LABELS[templateType]} ${actionType === 'FORWARD_TEMPLATE' ? 'forward' : 'response'} template`, `${ENGINE_LABELS[templateType]} ${actionType === 'FORWARD_TEMPLATE' ? '转发' : '响应'}模板`)} />
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr(`Renders the template in the editor against a sample request, with the server's template engines and limits. Nothing is registered, logged or changed: a scenario.set call is reported, not applied.`, '使用服务器的模板引擎和限制，根据示例请求渲染编辑器中的模板。不会注册、记录或更改任何内容；scenario.set 调用只会报告而不会应用。')}
        </Typography>
        <TextField
          select
          size="small"
          fullWidth
          label={tr('Sample request', '示例请求')}
          value={selectedKey}
          onChange={(e) => { void chooseRequest(e.target.value); }}
          disabled={loadingRow}
          helperText={options.length === 0 ? tr('No recorded requests yet: send a request to MockServer to pick it here, or edit the sample below.', '尚无已记录请求：向 MockServer 发送请求后可在此选择，或编辑下方示例。') : undefined}
          sx={{ mb: 1.5 }}
        >
          <MenuItem value={DEFAULT_KEY}>{tr('Default sample (GET /)', '默认示例 (GET /)')}</MenuItem>
          {options.map(({ item, request }) => (
            <MenuItem key={item.key} value={item.key} sx={{ fontFamily: monospaceFontFamily, fontSize: '0.8rem' }}>
              {String(request['method'] ?? 'GET')} {String(request['path'] ?? '/')}
              {item.timestamp ? `  ·  ${item.timestamp}` : ''}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={tr('Sample request (JSON)', '示例请求（JSON）')}
          multiline
          minRows={4}
          maxRows={14}
          fullWidth
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
          error={requestError !== null}
          helperText={requestError ?? tr('The request the template sees as request. Edit it to try other values.', '这是模板所看到的 request；可编辑以尝试其他值。')}
          slotProps={{ htmlInput: { 'aria-label': tr('Sample request JSON', '示例请求 JSON'), sx: { fontFamily: monospaceFontFamily, fontSize: '0.78rem' } } }}
        />

        {running && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">{tr('Rendering the template…', '正在渲染模板…')}</Typography>
          </Box>
        )}
        {failure && <HumanErrorAlert error={failure.error} severity={failure.severity} sx={{ mt: 2 }} data-testid="template-test-failure" />}
        {report && <Result report={report} template={template} templateType={templateType} actionType={actionType} />}
      </DialogContent>
      <DialogActions>
        {running && <Button onClick={cancel}>{tr('Cancel', '取消')}</Button>}
        <Button variant="contained" onClick={() => { void run(); }} disabled={running || loadingRow || !template.trim()}>
          {tr('Run Test', '运行测试')}
        </Button>
        <Button onClick={close}>{tr('Close', '关闭')}</Button>
      </DialogActions>
    </Dialog>
  );
}
