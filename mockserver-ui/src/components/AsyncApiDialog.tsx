import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { loadAsyncApi, generateHttpExpectations, getAsyncApiStatus, verifyAsyncApi, AsyncApiUnavailableError } from '../lib/asyncApi';
import { humanizeError } from '../lib/errorMessage';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';

export default function AsyncApiDialog({
  open,
  onClose,
  connectionParams,
}: {
  open: boolean;
  onClose: () => void;
  connectionParams: ConnectionParams;
}) {
  const { tr } = useI18n();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [spec, setSpec] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [httpMode, setHttpMode] = useState(false);
  const [httpResult, setHttpResult] = useState<unknown[] | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [verifyBody, setVerifyBody] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const next = await getAsyncApiStatus(connectionParams);
        if (cancelled) return;
        setUnavailable(false);
        setStatus(next);
      } catch (e) {
        if (cancelled) return;
        // the server's 501 says how to enable the module; show that rather than a local paraphrase
        if (e instanceof AsyncApiUnavailableError) { setUnavailable(true); setStatus(null); setError(e.message); }
        else setError(humanizeError(e).message);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, connectionParams, refreshTick]);

  const submit = useCallback(async () => {
    if (!spec.trim()) { setError(tr('Paste an AsyncAPI spec (JSON or YAML).', '请粘贴 AsyncAPI 规范（JSON 或 YAML）。')); return; }
    setBusy(true);
    setError(null);
    setResult(null);
    setHttpResult(null);
    try {
      if (httpMode) {
        setHttpResult(await generateHttpExpectations(connectionParams, spec));
      } else {
        setResult(await loadAsyncApi(connectionParams, spec));
        setRefreshTick((t) => t + 1);
      }
    } catch (e) {
      if (e instanceof AsyncApiUnavailableError) { setUnavailable(true); setError(e.message); }
      else setError(humanizeError(e).message);
    } finally {
      setBusy(false);
    }
  }, [connectionParams, spec, httpMode]);

  const verify = useCallback(async () => {
    if (!verifyBody.trim()) { setError(tr('Paste a verification request (JSON).', '请粘贴验证请求（JSON）。')); return; }
    setVerifyBusy(true);
    setError(null);
    setVerifyResult(null);
    try {
      setVerifyResult(await verifyAsyncApi(connectionParams, verifyBody));
    } catch (e) {
      if (e instanceof AsyncApiUnavailableError) { setUnavailable(true); setError(e.message); }
      else setError(humanizeError(e).message);
    } finally {
      setVerifyBusy(false);
    }
  }, [connectionParams, verifyBody]);

  const handleClose = useCallback(() => {
    setSpec('');
    setVerifyBody('');
    setResult(null);
    setHttpResult(null);
    setVerifyResult(null);
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={fullScreen} aria-labelledby="asyncapi-dialog-title">
      <DialogTitle id="asyncapi-dialog-title">{tr('AsyncAPI Broker Mock', 'AsyncAPI 消息代理模拟')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr('Register an AsyncAPI spec to mock a message broker — paste the spec (JSON or YAML), or a', '注册 AsyncAPI 规范以模拟消息代理；请粘贴规范（JSON 或 YAML），或')} <code>{'{ spec, brokerConfig }'}</code> JSON {tr('object. Tick', '对象。勾选')} <strong>{tr('Generate HTTP expectations', '生成 HTTP 期望')}</strong>{tr(` to instead register HTTP expectations derived from the spec's channels.`, '可改为注册从规范 Channel 派生的 HTTP 期望。')}
        </Typography>
        {unavailable && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {/* the server's message says how to enable the module; fall back only if it sent none */}
            {error ?? tr("The AsyncAPI module (mockserver-async) is not on this server's classpath, so broker mocking is unavailable.", '此服务器的 classpath 中没有 AsyncAPI 模块 (mockserver-async)，因此消息代理模拟不可用。')}
          </Alert>
        )}
        {error && !unavailable && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {result && (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            {tr('AsyncAPI spec loaded.', 'AsyncAPI 规范已加载。')}
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', typography: 'caption', fontFamily: monospaceFontFamily, m: 0, mt: 0.5 }}>
              {JSON.stringify(result, null, 2)}
            </Box>
          </Alert>
        )}
        {httpResult && (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            {httpResult.length > 0
              ? tr(`Generated ${httpResult.length} HTTP expectation${httpResult.length === 1 ? '' : 's'}.`, `已生成 ${httpResult.length} 个 HTTP 期望。`)
              : tr('Generated HTTP expectations.', '已生成 HTTP 期望。')}
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', typography: 'caption', fontFamily: monospaceFontFamily, m: 0, mt: 0.5, maxHeight: 220, overflow: 'auto' }}>
              {JSON.stringify(httpResult, null, 2)}
            </Box>
          </Alert>
        )}
        <TextField
          label={tr('AsyncAPI spec (JSON / YAML)', 'AsyncAPI 规范（JSON / YAML）')}
          multiline minRows={10} maxRows={24} fullWidth disabled={unavailable}
          value={spec} onChange={(e) => setSpec(e.target.value)}
          placeholder={'asyncapi: 3.0.0\ninfo:\n  title: Orders\n  version: 1.0.0\nchannels:\n  orders:\n    address: orders'}
          slotProps={{ input: { sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }}
        />
        {status && Object.keys(status).length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{tr('Current status', '当前状态')}</Typography>
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', typography: 'caption', fontFamily: monospaceFontFamily, m: 0, mt: 0.5, maxHeight: 180, overflow: 'auto' }}>
              {JSON.stringify(status, null, 2)}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{tr('Verify Messages', '验证消息')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {tr('Check observed broker messages against a verification request.', '根据验证请求检查已观察到的消息代理消息。')}
        </Typography>
        <TextField
          label={tr('Verification request (JSON)', '验证请求（JSON）')}
          multiline minRows={5} maxRows={16} fullWidth disabled={unavailable}
          value={verifyBody} onChange={(e) => setVerifyBody(e.target.value)}
          placeholder={'{\n  "channel": "orders",\n  "count": { "atLeast": 1 }\n}'}
          helperText={tr('Count constraints go under "count": atLeast, atMost or exactly. Optional filters: payloadSubstring, or payloadJsonPath with expectedValue.', '数量约束放在 count 下：atLeast、atMost 或 exactly。可选筛选项：payloadSubstring，或带 expectedValue 的 payloadJsonPath。')}
          slotProps={{ input: { sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }}
        />
        {verifyResult && (
          <Alert severity={verifyResult.verified ? 'success' : 'warning'} sx={{ mt: 1 }}>
            {verifyResult.verified ? tr('Verified — the observed messages satisfy the request.', '验证通过：观察到的消息满足请求。') : (verifyResult.message || tr('Not verified.', '验证未通过。'))}
          </Alert>
        )}
        <Box sx={{ mt: 1 }}>
          <Button variant="outlined" size="small" disabled={verifyBusy || unavailable || !verifyBody.trim()} onClick={() => void verify()}>
            {verifyBusy ? tr('Verifying…', '正在验证…') : tr('Verify messages', '验证消息')}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <FormControlLabel
          sx={{ ml: 1 }}
          control={
            <Checkbox
              size="small"
              checked={httpMode}
              disabled={unavailable}
              onChange={(e) => setHttpMode(e.target.checked)}
            />
          }
          label={<Typography variant="body2">{tr('Generate HTTP expectations', '生成 HTTP 期望')}</Typography>}
        />
        <Box>
          <Button onClick={handleClose}>{tr('Close', '关闭')}</Button>
          <Button variant="contained" disabled={busy || unavailable} onClick={() => void submit()}>
            {httpMode ? tr('Generate expectations', '生成期望') : tr('Load spec', '加载规范')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
