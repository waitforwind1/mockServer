import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { createScimProvider, type ScimConfig, type ScimIdStrategy } from '../lib/scim';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import HumanErrorAlert from './HumanErrorAlert';
import { useI18n } from '../i18n';

export default function ScimDialog({
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
  const [basePath, setBasePath] = useState('');
  const [idStrategy, setIdStrategy] = useState<ScimIdStrategy>('UUID');
  // enforceFilter / enforcePatch default to true on the server, so the switches
  // start on; only a user turning one OFF is sent.
  const [enforceFilter, setEnforceFilter] = useState(true);
  const [enforcePatch, setEnforcePatch] = useState(true);
  const [requireBearerToken, setRequireBearerToken] = useState(false);
  const [expectedBearerToken, setExpectedBearerToken] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HumanError | null>(null);
  const [created, setCreated] = useState<number | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCreated(null);
    // Only send fields that differ from the server defaults; blanks fall back to defaults.
    const config: ScimConfig = {};
    if (basePath.trim()) config.basePath = basePath.trim();
    if (idStrategy !== 'UUID') config.idStrategy = idStrategy;
    if (!enforceFilter) config.enforceFilter = false;
    if (!enforcePatch) config.enforcePatch = false;
    if (requireBearerToken) {
      config.requireBearerToken = true;
      if (expectedBearerToken.trim()) config.expectedBearerToken = expectedBearerToken.trim();
    }
    try {
      setCreated(await createScimProvider(connectionParams, config));
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }, [connectionParams, basePath, idStrategy, enforceFilter, enforcePatch, requireBearerToken, expectedBearerToken]);

  const handleClose = useCallback(() => {
    setBasePath('');
    setIdStrategy('UUID');
    setEnforceFilter(true);
    setEnforcePatch(true);
    setRequireBearerToken(false);
    setExpectedBearerToken('');
    setError(null);
    setCreated(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen} aria-labelledby="scim-dialog-title">
      <DialogTitle id="scim-dialog-title">{tr('Mock SCIM Provider', '模拟 SCIM 提供方')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr('Register a mock SCIM 2.0 provider — Users and Groups resource endpoints plus the service-provider discovery documents — as expectations. Leave a field blank to use the server default.', '将模拟 SCIM 2.0 提供方注册为一组期望，包括 Users 和 Groups 资源端点及服务提供方发现文档。字段留空则使用服务器默认值。')}
        </Typography>
        {error && <HumanErrorAlert error={error} sx={{ mb: 1.5 }} />}
        {created !== null && (
          <Alert severity="success" sx={{ mb: 1.5 }}>{tr(`Created ${created} expectation${created === 1 ? '' : 's'} for the mock SCIM provider.`, `已为模拟 SCIM 提供方创建 ${created} 个期望。`)}</Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" label={tr('Base path', '基础路径')} placeholder="/scim/v2" value={basePath} onChange={(e) => setBasePath(e.target.value)} sx={{ flex: 1 }} />
            <TextField
              size="small"
              select
              label={tr('ID strategy', 'ID 策略')}
              value={idStrategy}
              onChange={(e) => setIdStrategy(e.target.value as ScimIdStrategy)}
              sx={{ width: { xs: '100%', sm: 170 } }}
            >
              <MenuItem value="UUID">UUID</MenuItem>
              <MenuItem value="AUTO_INCREMENT">{tr('Auto-increment', '自动递增')}</MenuItem>
            </TextField>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{tr('Behaviour', '行为')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel control={<Switch size="small" checked={enforceFilter} onChange={(e) => setEnforceFilter(e.target.checked)} />} label={<Typography variant="body2">{tr('Enforce filter', '强制执行筛选规则')}</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={enforcePatch} onChange={(e) => setEnforcePatch(e.target.checked)} />} label={<Typography variant="body2">{tr('Enforce PATCH', '强制执行 PATCH 规则')}</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={requireBearerToken} onChange={(e) => setRequireBearerToken(e.target.checked)} />} label={<Typography variant="body2">{tr('Require bearer token', '要求 Bearer 令牌')}</Typography>} />
            </Box>
          </Box>
          {requireBearerToken && (
            <TextField
              size="small"
              label={tr('Expected bearer token', '预期 Bearer 令牌')}
              placeholder={tr('Any non-empty token accepted when blank', '留空时接受任意非空令牌')}
              value={expectedBearerToken}
              onChange={(e) => setExpectedBearerToken(e.target.value)}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tr('Close', '关闭')}</Button>
        <Button variant="contained" disabled={busy} onClick={() => void submit()}>{tr('Create provider', '创建提供方')}</Button>
      </DialogActions>
    </Dialog>
  );
}
