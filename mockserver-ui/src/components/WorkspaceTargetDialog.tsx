import { useEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import {
  describeTarget,
  isCrossOrigin,
  probeTarget,
  urlConnectionParams,
  validateConnection,
  type WorkspaceConnection,
} from '../lib/connectionTarget';
import { useI18n } from '../i18n';

/**
 * Edit which MockServer one workspace targets. Saving checks the target answers the
 * dashboard's control-plane calls first, and says why when it does not; the user can still
 * save an unreachable target (for a server not started yet) with "Save anyway".
 */
export default function WorkspaceTargetDialog({
  workspaceName,
  connection,
  onSave,
  onClose,
}: {
  workspaceName: string;
  connection: WorkspaceConnection | null;
  onSave: (connection: WorkspaceConnection | null) => void;
  onClose: () => void;
}) {
  const { tr } = useI18n();
  const [urlTarget] = useState(urlConnectionParams);
  const start = connection ?? { ...urlTarget, basePath: urlTarget.basePath ?? '' };
  const [host, setHost] = useState(start.host);
  const [port, setPort] = useState(start.port);
  const [secure, setSecure] = useState(start.secure);
  const [basePath, setBasePath] = useState(start.basePath);
  const [checking, setChecking] = useState(false);
  const [probeFailure, setProbeFailure] = useState<string | null>(null);
  // A check still running when the dialog closes must not save the target afterwards.
  const openRef = useRef(true);
  useEffect(() => {
    openRef.current = true;
    return () => { openRef.current = false; };
  }, []);
  const close = () => {
    openRef.current = false;
    onClose();
  };

  const validation = validateConnection({ host, port, secure, basePath });
  const fieldError = (field: 'host' | 'port' | 'basePath') =>
    !validation.ok && validation.field === field ? validation.message : undefined;
  const crossOrigin = validation.ok && isCrossOrigin(validation.value);

  const edit = (apply: () => void) => {
    apply();
    setProbeFailure(null);
  };

  const save = async () => {
    if (!validation.ok) return;
    if (probeFailure !== null) {
      onSave(validation.value);
      return;
    }
    setChecking(true);
    const result = await probeTarget(validation.value);
    if (!openRef.current) return;
    setChecking(false);
    if (result.ok) {
      onSave(validation.value);
    } else {
      setProbeFailure(result.message);
    }
  };

  return (
    <Dialog open onClose={close} maxWidth="sm" fullWidth aria-labelledby="workspace-target-title">
      <DialogTitle id="workspace-target-title">{tr(`MockServer for ${workspaceName}`, `${workspaceName} 的 MockServer`)}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {tr('Every view, action and live update in this workspace goes to this server. Changing it clears what the workspace showed from the previous one. The other workspaces keep their own targets, and breakpoints set on a server stay active while any workspace targets it.', '此工作区中的所有视图、操作和实时更新都会连接到这台服务器。更改目标会清除工作区中来自旧服务器的内容；其他工作区会保留各自的目标。只要仍有工作区指向某服务器，该服务器上的断点就会保持活动。')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          <TextField
            size="small"
            label={tr('Host', '主机')}
            value={host}
            onChange={(e) => edit(() => setHost(e.target.value))}
            error={!!fieldError('host')}
            helperText={fieldError('host')}
            sx={{ flex: 2, minWidth: 200 }}
            autoFocus
          />
          <TextField
            size="small"
            label={tr('Port', '端口')}
            value={port}
            onChange={(e) => edit(() => setPort(e.target.value))}
            error={!!fieldError('port')}
            helperText={fieldError('port')}
            sx={{ flex: 1, minWidth: 100 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1.5 }}>
          <TextField
            size="small"
            label={tr('Base path (optional)', '基础路径（可选）')}
            placeholder="/mock"
            value={basePath}
            onChange={(e) => edit(() => setBasePath(e.target.value))}
            error={!!fieldError('basePath')}
            helperText={fieldError('basePath')}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <FormControlLabel
            control={<Switch checked={secure} onChange={(e) => edit(() => setSecure(e.target.checked))} />}
            label={tr('Use https', '使用 HTTPS')}
          />
        </Box>
        {crossOrigin && probeFailure === null && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {tr('This is a different origin from the dashboard, so the browser applies CORS to every call. By default MockServer answers CORS for its control plane when this dashboard is on localhost; otherwise list this dashboard’s origin in the target’s controlPlaneCorsAllowOrigin.', '此目标与仪表板来源不同，因此浏览器会对每个调用实施 CORS。仪表板位于 localhost 时，MockServer 默认允许控制平面 CORS；否则请将此仪表板的来源加入目标服务器的 controlPlaneCorsAllowOrigin。')}
          </Alert>
        )}
        {probeFailure !== null && (
          <Alert severity="warning" sx={{ mt: 2 }} data-testid="workspace-target-probe-failure">
            {probeFailure}
          </Alert>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {tr(`The dashboard URL targets ${describeTarget(urlTarget)}.`, `仪表板 URL 指向 ${describeTarget(urlTarget)}。`)}
        </Typography>
      </DialogContent>
      <DialogActions>
        {connection !== null && (
          <Button onClick={() => onSave(null)} sx={{ mr: 'auto' }}>
            {tr("Use the dashboard URL's server", '使用仪表板 URL 对应的服务器')}
          </Button>
        )}
        <Button onClick={close}>{tr('Cancel', '取消')}</Button>
        <Button variant="contained" onClick={() => { void save(); }} disabled={!validation.ok || checking}>
          {checking ? tr('Checking…', '正在检查…') : probeFailure !== null ? tr('Save anyway', '仍然保存') : tr('Save', '保存')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
