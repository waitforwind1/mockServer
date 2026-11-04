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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { createOidcProvider, type OidcConfig } from '../lib/oidc';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import HumanErrorAlert from './HumanErrorAlert';
import { useI18n } from '../i18n';

export default function OidcDialog({
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
  const [issuer, setIssuer] = useState('');
  const [subject, setSubject] = useState('');
  const [clientId, setClientId] = useState('');
  const [audience, setAudience] = useState('');
  const [scopes, setScopes] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState('');
  const [issueExpiredToken, setIssueExpiredToken] = useState(false);
  const [wrongIssuer, setWrongIssuer] = useState(false);
  const [tamperedSignature, setTamperedSignature] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HumanError | null>(null);
  const [created, setCreated] = useState<number | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCreated(null);
    // Only send fields the user set; blanks fall back to the server defaults.
    const config: OidcConfig = {};
    if (issuer.trim()) config.issuer = issuer.trim();
    if (subject.trim()) config.subject = subject.trim();
    if (clientId.trim()) config.clientId = clientId.trim();
    if (audience.trim()) config.audience = audience.trim();
    const scopeList = scopes.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (scopeList.length > 0) config.scopes = scopeList;
    const expiry = parseInt(tokenExpiry, 10);
    if (!isNaN(expiry) && expiry > 0) config.tokenExpirySeconds = expiry;
    if (issueExpiredToken) config.issueExpiredToken = true;
    if (wrongIssuer) config.wrongIssuer = true;
    if (tamperedSignature) config.tamperedSignature = true;
    try {
      setCreated(await createOidcProvider(connectionParams, config));
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }, [connectionParams, issuer, subject, clientId, audience, scopes, tokenExpiry, issueExpiredToken, wrongIssuer, tamperedSignature]);

  const handleClose = useCallback(() => {
    setIssuer('');
    setSubject('');
    setClientId('');
    setAudience('');
    setScopes('');
    setTokenExpiry('');
    setIssueExpiredToken(false);
    setWrongIssuer(false);
    setTamperedSignature(false);
    setError(null);
    setCreated(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen} aria-labelledby="oidc-dialog-title">
      <DialogTitle id="oidc-dialog-title">{tr('Mock OIDC Provider', '模拟 OIDC 提供方')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr('Register a mock OIDC/OAuth2 provider — discovery document, JWKS, and token / userinfo / introspection / revocation endpoints — as expectations. Leave a field blank to use the server default.', '将模拟 OIDC/OAuth2 提供方注册为一组期望，包括发现文档、JWKS 以及令牌、userinfo、内省和撤销端点。字段留空则使用服务器默认值。')}
        </Typography>
        {error && <HumanErrorAlert error={error} sx={{ mb: 1.5 }} />}
        {created !== null && (
          <Alert severity="success" sx={{ mb: 1.5 }}>{tr(`Created ${created} expectation${created === 1 ? '' : 's'} for the mock OIDC provider.`, `已为模拟 OIDC 提供方创建 ${created} 个期望。`)}</Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField size="small" label={tr('Issuer', '签发方')} placeholder="http://localhost:1080" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" label={tr('Subject', '主体')} placeholder="mock-user" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label={tr('Client ID', '客户端 ID')} placeholder="mock-client" value={clientId} onChange={(e) => setClientId(e.target.value)} sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" label={tr('Audience', '受众')} placeholder="mock-audience" value={audience} onChange={(e) => setAudience(e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label={tr('Token expiry (s)', '令牌有效期（秒）')} type="number" placeholder="3600" value={tokenExpiry} onChange={(e) => setTokenExpiry(e.target.value)} sx={{ width: { xs: '100%', sm: 150 } }} />
          </Box>
          <TextField size="small" label={tr('Scopes (space/comma separated)', 'Scope（空格或逗号分隔）')} placeholder="openid profile email" value={scopes} onChange={(e) => setScopes(e.target.value)} />
          <Box>
            <Typography variant="caption" color="text.secondary">{tr('Negative testing', '负向测试')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel control={<Switch size="small" checked={issueExpiredToken} onChange={(e) => setIssueExpiredToken(e.target.checked)} />} label={<Typography variant="body2">{tr('Expired token', '过期令牌')}</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={wrongIssuer} onChange={(e) => setWrongIssuer(e.target.checked)} />} label={<Typography variant="body2">{tr('Wrong issuer', '错误签发方')}</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={tamperedSignature} onChange={(e) => setTamperedSignature(e.target.checked)} />} label={<Typography variant="body2">{tr('Tampered signature', '篡改签名')}</Typography>} />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tr('Close', '关闭')}</Button>
        <Button variant="contained" disabled={busy} onClick={() => void submit()}>{tr('Create provider', '创建提供方')}</Button>
      </DialogActions>
    </Dialog>
  );
}
