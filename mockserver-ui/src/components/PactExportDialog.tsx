import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { exportPact, verifyPact, importPact } from '../lib/pactExport';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import { monospaceFontFamily } from '../theme';
import HumanErrorAlert from './HumanErrorAlert';
import { trackFeature } from '../lib/analytics';
import { useI18n } from '../i18n';

interface PactExportDialogProps {
  open: boolean;
  onClose: () => void;
  connectionParams: ConnectionParams;
}

/**
 * Dialog to export the active response expectations as a Pact v3 consumer
 * contract via PUT /mockserver/pact, with copy / download of the result.
 */
export default function PactExportDialog({ open, onClose, connectionParams }: PactExportDialogProps) {
  const { tr } = useI18n();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [consumer, setConsumer] = useState('');
  const [provider, setProvider] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HumanError | null>(null);
  const [pactText, setPactText] = useState<string | null>(null);

  // Verify section
  const [verifyText, setVerifyText] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<HumanError | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; result: unknown } | null>(null);

  // Import section
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<HumanError | null>(null);
  const [importResult, setImportResult] = useState<unknown[] | null>(null);

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImportBusy(true);
    setImportError(null);
    setImportResult(null);
    try {
      setImportResult(await importPact(connectionParams, importText));
    } catch (e) {
      setImportError(humanizeError(e));
    } finally {
      setImportBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyText.trim()) return;
    setVerifyBusy(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      setVerifyResult(await verifyPact(connectionParams, verifyText));
    } catch (e) {
      setVerifyError(humanizeError(e));
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    setPactText(null);
    try {
      const pact = await exportPact(connectionParams, consumer, provider);
      trackFeature('export_performed');
      setPactText(JSON.stringify(pact, null, 2));
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (pactText !== null && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(pactText);
    }
  };

  const handleDownload = () => {
    if (pactText === null) return;
    const blob = new Blob([pactText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(consumer || 'consumer').trim()}-${(provider || 'provider').trim()}.pact.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setError(null);
    setPactText(null);
    setVerifyError(null);
    setVerifyResult(null);
    setImportError(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={fullScreen} aria-labelledby="pact-dialog-title">
      <DialogTitle id="pact-dialog-title">{tr('Pact Contract', 'Pact 契约')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {tr('Export the active response expectations as a Pact v3 consumer contract for publishing to a Pact Broker / PactFlow.', '将活动响应期望导出为 Pact v3 消费方契约，以便发布到 Pact Broker / PactFlow。')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            value={consumer}
            onChange={(e) => setConsumer(e.target.value)}
            label={tr('Consumer', '消费方')}
            placeholder="consumer"
            size="small"
            fullWidth
          />
          <TextField
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            label={tr('Provider', '提供方')}
            placeholder="provider"
            size="small"
            fullWidth
          />
        </Stack>
        {error !== null && <HumanErrorAlert error={error} sx={{ mb: 1 }} />}
        {pactText !== null && (
          <TextField
            value={pactText}
            label={tr('Pact contract (JSON)', 'Pact 契约（JSON）')}
            multiline
            minRows={10}
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{tr('Verify a Contract', '验证契约')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {tr('Paste a Pact contract to check it against the registered expectations.', '粘贴 Pact 契约，并根据已注册的期望进行检查。')}
        </Typography>
        <TextField
          value={verifyText}
          onChange={(e) => setVerifyText(e.target.value)}
          label={tr('Pact contract to verify (JSON)', '要验证的 Pact 契约（JSON）')}
          placeholder={'{\n  "consumer": { "name": "..." },\n  "provider": { "name": "..." },\n  "interactions": [ ... ]\n}'}
          multiline
          minRows={6}
          maxRows={16}
          fullWidth
          slotProps={{ input: { sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }}
        />
        {verifyError !== null && <HumanErrorAlert error={verifyError} sx={{ mt: 1 }} />}
        {verifyResult !== null && (
          <Alert severity={verifyResult.verified ? 'success' : 'warning'} sx={{ mt: 1 }}>
            {verifyResult.verified ? tr('Contract verified — all interactions are satisfied.', '契约验证通过：所有交互均已满足。') : tr('Not verified — some interactions are not satisfied.', '验证未通过：部分交互未满足。')}
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', typography: 'caption', fontFamily: monospaceFontFamily, m: 0, mt: 0.5, maxHeight: 220, overflow: 'auto' }}>
              {JSON.stringify(verifyResult.result, null, 2)}
            </Box>
          </Alert>
        )}
        <Box sx={{ mt: 1 }}>
          <Button variant="outlined" size="small" onClick={() => void handleVerify()} disabled={verifyBusy || !verifyText.trim()}>
            {verifyBusy ? tr('Verifying…', '正在验证…') : tr('Verify contract', '验证契约')}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{tr('Import a Contract', '导入契约')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {tr('Paste a Pact contract to register its interactions as expectations.', '粘贴 Pact 契约，将其中的交互注册为期望。')}
        </Typography>
        <TextField
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          label={tr('Pact contract to import (JSON)', '要导入的 Pact 契约（JSON）')}
          placeholder={'{\n  "consumer": { "name": "..." },\n  "provider": { "name": "..." },\n  "interactions": [ ... ]\n}'}
          multiline
          minRows={6}
          maxRows={16}
          fullWidth
          slotProps={{ input: { sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }}
        />
        {importError !== null && <HumanErrorAlert error={importError} sx={{ mt: 1 }} />}
        {importResult !== null && (
          <Alert severity="success" sx={{ mt: 1 }}>
            {importResult.length > 0
              ? tr(`Imported ${importResult.length} expectation${importResult.length === 1 ? '' : 's'}.`, `已导入 ${importResult.length} 个期望。`)
              : tr('Import succeeded.', '导入成功。')}
            {importResult.length > 0 && (
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', typography: 'caption', fontFamily: monospaceFontFamily, m: 0, mt: 0.5, maxHeight: 220, overflow: 'auto' }}>
                {JSON.stringify(importResult, null, 2)}
              </Box>
            )}
          </Alert>
        )}
        <Box sx={{ mt: 1 }}>
          <Button variant="outlined" size="small" onClick={() => void handleImport()} disabled={importBusy || !importText.trim()}>
            {importBusy ? tr('Importing…', '正在导入…') : tr('Import contract', '导入契约')}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tr('Close', '关闭')}</Button>
        {pactText !== null && <Button onClick={handleCopy}>{tr('Copy', '复制')}</Button>}
        {pactText !== null && <Button onClick={handleDownload}>{tr('Download', '下载')}</Button>}
        <Button variant="contained" onClick={() => void handleExport()} disabled={busy}>
          {busy ? tr('Exporting…', '正在导出…') : tr('Export', '导出')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
