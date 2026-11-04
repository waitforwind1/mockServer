import { useState, useMemo, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import { previewMatch, type PreviewResult, type SampleRequest, type FieldResult } from '../lib/matcherPreview';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';

const DEFAULT_EXPECTATION = `{
  "httpRequest": {
    "method": "GET",
    "path": "/api/.*",
    "queryStringParameters": { "page": ["[0-9]+"] }
  }
}`;

const DEFAULT_SAMPLE: SampleRequest = {
  method: 'GET',
  path: '/api/users',
  headers: 'Accept: application/json',
  queryString: 'page=1',
  body: '',
};

function verdictIcon(verdict: FieldResult['verdict']) {
  if (verdict === 'match') return <CheckCircleIcon sx={{ fontSize: '1rem', color: 'success.main' }} />;
  if (verdict === 'mismatch') return <CancelIcon sx={{ fontSize: '1rem', color: 'error.main' }} />;
  return <HelpOutlineIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />;
}

function FieldRow({ r }: { r: FieldResult }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, py: 0.5, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
      <Box sx={{ pt: '2px' }}>{verdictIcon(r.verdict)}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontFamily: monospaceFontFamily, fontWeight: 600, display: 'block' }}>
          {r.field}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monospaceFontFamily, display: 'block', wordBreak: 'break-word' }}>
          expected {r.expected} · actual {r.actual}
        </Typography>
        {r.reason && (
          <Typography variant="caption" color={r.verdict === 'unsupported' ? 'warning.main' : 'error.main'} sx={{ display: 'block', wordBreak: 'break-word' }}>
            {r.reason}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/**
 * WS5.5 "matcher test playground": lets a user enter a hypothetical request and a
 * candidate expectation, then see whether the expectation would match — BEFORE
 * registering it. The verdict is computed client-side (a clearly-labelled preview)
 * because MockServer exposes no endpoint to dry-run an *unregistered* expectation.
 */
export default function MatcherPlaygroundDialog({
  open,
  onClose,
  initialExpectation,
}: {
  open: boolean;
  onClose: () => void;
  /** Optional expectation JSON to pre-fill (e.g. "Test this expectation" from a list). */
  initialExpectation?: string;
}) {
  const { tr } = useI18n();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [expectationText, setExpectationText] = useState(initialExpectation ?? DEFAULT_EXPECTATION);
  const [sample, setSample] = useState<SampleRequest>(DEFAULT_SAMPLE);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Re-seed the expectation when a *new* initial value arrives (a fresh "Test this
  // expectation") using React's sanctioned "adjust state during render" pattern:
  // track the last-applied seed in state and compare during render. User edits
  // between re-seeds are preserved because the seed only changes when the incoming
  // prop itself changes.
  const [lastSeed, setLastSeed] = useState(initialExpectation);
  if (initialExpectation != null && initialExpectation !== lastSeed) {
    setLastSeed(initialExpectation);
    setExpectationText(initialExpectation);
    setResult(null);
    setParseError(null);
  }

  const setField = useCallback(
    (key: keyof SampleRequest) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setSample((s) => ({ ...s, [key]: e.target.value })),
    [],
  );

  const runTest = useCallback(() => {
    let expectation: unknown;
    try {
      expectation = JSON.parse(expectationText);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      setResult(null);
      return;
    }
    setParseError(null);
    setResult(previewMatch(expectation, sample));
  }, [expectationText, sample]);

  const verdictChip = useMemo(() => {
    if (!result) return null;
    if (result.matches) {
      return <Chip color="success" icon={<CheckCircleIcon />} label={tr('WOULD MATCH', '会匹配')} />;
    }
    if (result.hasUnsupported) {
      return <Chip color="warning" icon={<HelpOutlineIcon />} label={tr('INCONCLUSIVE', '无法确定')} />;
    }
    return <Chip color="error" icon={<CancelIcon />} label={tr('WOULD NOT MATCH', '不会匹配')} />;
  }, [result, tr]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {tr('Matcher Test Playground', '匹配器测试场')}
        <IconButton size="small" onClick={onClose} aria-label={tr('Close', '关闭')}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {tr(
            'Preview only — the verdict is computed in the browser for the common matcher types (method, path, headers, query, body), not by the server. Unsupported matcher fields are flagged and make the result inconclusive.',
            '仅供预览 — 结果由浏览器针对常见匹配器类型（请求方法、路径、请求头、查询参数、正文）计算，而非由服务器计算。不支持的匹配字段会被标记，并使结果变为“无法确定”。',
          )}
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {tr('Candidate Expectation (JSON)', '候选预期（JSON）')}
            </Typography>
            <TextField
              value={expectationText}
              onChange={(e) => setExpectationText(e.target.value)}
              multiline
              minRows={10}
              fullWidth
              error={parseError !== null}
              helperText={parseError ?? tr('Either a full expectation or a bare httpRequest object.', '可输入完整预期，或仅输入 httpRequest 对象。')}
              slotProps={{ htmlInput: { 'aria-label': tr('Candidate expectation JSON', '候选预期 JSON'), sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {tr('Sample Request', '示例请求')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField size="small" label={tr('Method', '请求方法')} value={sample.method} onChange={setField('method')}
                slotProps={{ htmlInput: { 'aria-label': tr('Sample method', '示例请求方法') } }} />
              <TextField size="small" label={tr('Path', '路径')} value={sample.path} onChange={setField('path')}
                slotProps={{ htmlInput: { 'aria-label': tr('Sample path', '示例路径') } }} />
              <TextField size="small" label={tr('Query (name=value per line)', '查询参数（每行 name=value）')} value={sample.queryString} onChange={setField('queryString')}
                multiline minRows={2} slotProps={{ htmlInput: { 'aria-label': tr('Sample query', '示例查询参数'), sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }} />
              <TextField size="small" label={tr('Headers (Name: value per line)', '请求头（每行 Name: value）')} value={sample.headers} onChange={setField('headers')}
                multiline minRows={2} slotProps={{ htmlInput: { 'aria-label': tr('Sample headers', '示例请求头'), sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }} />
              <TextField size="small" label={tr('Body', '正文')} value={sample.body} onChange={setField('body')}
                multiline minRows={2} slotProps={{ htmlInput: { 'aria-label': tr('Sample body', '示例正文'), sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }} />
            </Box>
          </Box>
        </Box>

        {result && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {verdictChip}
              {result.hasUnsupported && (
                <Typography variant="caption" color="warning.main">
                  {tr('Some matcher fields could not be evaluated in the browser — register the expectation and use Debug Mismatch for a definitive answer.', '浏览器无法评估部分匹配字段 — 请注册该预期并使用“调试不匹配（Debug Mismatch）”获取准确结果。')}
                </Typography>
              )}
            </Box>
            {result.results.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {tr('This expectation has no matcher fields, so it matches every request.', '此预期没有匹配字段，因此会匹配所有请求。')}
              </Typography>
            ) : (
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1 }}>
                {result.results.map((r, i) => (
                  <FieldRow key={`${r.field}-${i}`} r={r} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={runTest} variant="contained" size="small">
          {tr('Test request', '测试请求')}
        </Button>
        <Button onClick={onClose} size="small">
          {tr('Close', '关闭')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
