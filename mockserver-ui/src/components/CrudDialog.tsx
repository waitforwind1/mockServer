import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { registerCrudResource, type CrudConfig, type CrudResult } from '../lib/crud';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import HumanErrorAlert from './HumanErrorAlert';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';

export default function CrudDialog({
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
  const [idField, setIdField] = useState('');
  const [idStrategy, setIdStrategy] = useState<'AUTO_INCREMENT' | 'UUID'>('AUTO_INCREMENT');
  const [initialData, setInitialData] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HumanError | null>(null);
  const [result, setResult] = useState<CrudResult | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    setResult(null);

    const trimmedBasePath = basePath.trim();
    if (!trimmedBasePath) {
      setError({ message: tr('basePath is required.', '必须填写 basePath。') });
      return;
    }

    // Parse initialData if provided.
    let parsedInitialData: unknown[] | undefined;
    const trimmedData = initialData.trim();
    if (trimmedData) {
      try {
        const parsed: unknown = JSON.parse(trimmedData);
        if (!Array.isArray(parsed)) {
          setError({ message: tr('initialData must be a JSON array.', 'initialData 必须是 JSON 数组。') });
          return;
        }
        parsedInitialData = parsed;
      } catch {
        setError({ message: tr('initialData is not valid JSON.', 'initialData 不是有效的 JSON。') });
        return;
      }
    }

    // Only send fields the user set; blanks fall back to the server defaults.
    const config: CrudConfig = { basePath: trimmedBasePath };
    if (idField.trim()) config.idField = idField.trim();
    if (idStrategy !== 'AUTO_INCREMENT') config.idStrategy = idStrategy;
    if (parsedInitialData) config.initialData = parsedInitialData;

    setBusy(true);
    try {
      setResult(await registerCrudResource(connectionParams, config));
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }, [connectionParams, basePath, idField, idStrategy, initialData]);

  const handleClose = useCallback(() => {
    setBasePath('');
    setIdField('');
    setIdStrategy('AUTO_INCREMENT');
    setInitialData('');
    setError(null);
    setResult(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen} aria-labelledby="crud-dialog-title">
      <DialogTitle id="crud-dialog-title">{tr('Register CRUD Resource', '注册 CRUD 资源')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr('Register auto-CRUD expectations for a resource path — GET, POST, PUT, and DELETE endpoints with automatic ID management. Leave optional fields blank to use server defaults.', '为资源路径注册自动 CRUD 期望，提供 GET、POST、PUT 和 DELETE 端点并自动管理 ID。可选字段留空则使用服务器默认值。')}
        </Typography>
        {error && <HumanErrorAlert error={error} sx={{ mb: 1.5 }} />}
        {result && (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            {tr(`Registered CRUD resource at `, '已注册 CRUD 资源：')}<strong>{result.basePath}</strong> ({result.idStrategy}, {tr(`${result.itemCount} item${result.itemCount === 1 ? '' : 's'}`, `${result.itemCount} 个条目`)}).
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            size="small"
            label={tr('Resource path', '资源路径')}
            required
            placeholder="/api/users"
            helperText={tr('The base path the CRUD endpoints are mounted under.', 'CRUD 端点挂载的基础路径。')}
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label={tr('ID field name', 'ID 字段名称')}
              placeholder="id"
              helperText={tr("Property used as each item's identifier (default: id).", '用作每个条目标识符的属性（默认：id）。')}
              value={idField}
              onChange={(e) => setIdField(e.target.value)}
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 140 } }}
            />
            <TextField
              size="small"
              label={tr('ID strategy', 'ID 策略')}
              select
              helperText={tr('How new item IDs are generated.', '新条目 ID 的生成方式。')}
              value={idStrategy}
              onChange={(e) => setIdStrategy(e.target.value as 'AUTO_INCREMENT' | 'UUID')}
              sx={{ width: { xs: '100%', sm: 180 } }}
            >
              <MenuItem value="AUTO_INCREMENT">AUTO_INCREMENT</MenuItem>
              <MenuItem value="UUID">UUID</MenuItem>
            </TextField>
          </Box>
          <TextField
            size="small"
            label={tr('Seed data (JSON array)', '种子数据（JSON 数组）')}
            multiline
            minRows={3}
            maxRows={10}
            placeholder={'[\n  { "name": "Alice" },\n  { "name": "Bob" }\n]'}
            helperText={tr('Optional JSON array of items to pre-populate the resource.', '用于预填充资源的可选 JSON 条目数组。')}
            value={initialData}
            onChange={(e) => setInitialData(e.target.value)}
            slotProps={{ input: { sx: { fontFamily: monospaceFontFamily, typography: 'body2' } } }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tr('Close', '关闭')}</Button>
        <Button variant="contained" disabled={busy} onClick={() => void submit()}>{tr('Register', '注册')}</Button>
      </DialogActions>
    </Dialog>
  );
}
