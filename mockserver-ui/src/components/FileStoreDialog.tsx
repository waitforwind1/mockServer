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
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ConfirmDialog from './ConfirmDialog';
import HumanErrorAlert from './HumanErrorAlert';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';
import {
  listFiles,
  storeFile,
  deleteFile,
  retrieveFileText,
} from '../lib/fileStore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FileStoreDialogProps {
  open: boolean;
  onClose: () => void;
  connectionParams: ConnectionParams;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FileStoreDialog({ open, onClose, connectionParams }: FileStoreDialogProps) {
  const { tr } = useI18n();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState<HumanError | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Add-file form state
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newBase64, setNewBase64] = useState(false);
  const [storing, setStoring] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState<string | null>(null);

  // View state
  const [viewName, setViewName] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const [viewError, setViewError] = useState<HumanError | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // Load file list on open / after mutations. setState only after the await,
  // guarded by `cancelled`, so we never call setState synchronously in the effect.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const next = await listFiles(connectionParams);
        if (!cancelled) {
          setFiles(next);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setFiles([]);
          setError(humanizeError(e));
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, connectionParams, refreshTick]);

  const handleStore = useCallback(async () => {
    if (!newName.trim()) return;
    setStoring(true);
    setError(null);
    setStoreSuccess(null);
    try {
      const result = await storeFile(connectionParams, {
        name: newName.trim(),
        content: newContent,
        base64: newBase64 || undefined,
      });
      setStoreSuccess(tr(`Stored "${result.name}" (${result.size} bytes)`, `已存储“${result.name}”（${result.size} 字节）`));
      setNewName('');
      setNewContent('');
      setNewBase64(false);
      refresh();
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setStoring(false);
    }
  }, [connectionParams, newName, newContent, newBase64, refresh]);

  const handleDelete = useCallback(async (name: string) => {
    setError(null);
    try {
      await deleteFile(connectionParams, name);
      // If the deleted file is currently viewed, clear the view
      if (viewName === name) {
        setViewName(null);
        setViewContent(null);
      }
      refresh();
    } catch (e) {
      setError(humanizeError(e));
    }
  }, [connectionParams, refresh, viewName]);

  const handleView = useCallback(async (name: string) => {
    setViewError(null);
    setViewContent(null);
    setViewName(name);
    try {
      const text = await retrieveFileText(connectionParams, name);
      setViewContent(text);
    } catch (e) {
      setViewError(humanizeError(e));
    }
  }, [connectionParams]);

  const handleClose = useCallback(() => {
    setDeleteTarget(null);
    setViewName(null);
    setViewContent(null);
    setViewError(null);
    setStoreSuccess(null);
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <>
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={fullScreen} aria-labelledby="file-store-dialog-title">
      <DialogTitle id="file-store-dialog-title">{tr('File Store', '文件存储')}</DialogTitle>
      <DialogContent dividers>
        {error && <HumanErrorAlert error={error} sx={{ mb: 1.5 }} />}
        {storeSuccess && <Alert severity="success" sx={{ mb: 1.5 }}>{storeSuccess}</Alert>}

        {/* File list */}
        {files.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">{tr('No files in the store', '存储中没有文件')}</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ typography: 'subtitle2' }}>{tr('Name', '名称')}</TableCell>
                  <TableCell sx={{ typography: 'subtitle2' }} align="center">{tr('Actions', '操作')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((name) => (
                  <TableRow key={name}>
                    <TableCell sx={{ typography: 'subtitle2', fontWeight: 400, fontFamily: monospaceFontFamily }}>{name}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => void handleView(name)} aria-label={tr(`View ${name}`, `查看 ${name}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteTarget(name)} aria-label={tr(`Delete ${name}`, `删除 ${name}`)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* View panel */}
        {viewName && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {tr(`Content of ${viewName}`, `${viewName} 的内容`)}
            </Typography>
            {viewError && <HumanErrorAlert error={viewError} sx={{ mt: 0.5 }} />}
            {viewContent !== null && (
              <Box
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  typography: 'caption',
                  fontFamily: monospaceFontFamily,
                  m: 0,
                  mt: 0.5,
                  maxHeight: 200,
                  overflow: 'auto',
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {viewContent}
              </Box>
            )}
          </Box>
        )}

        {/* Add file form */}
        <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>{tr('Add File', '添加文件')}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label={tr('File name', '文件名')}
            size="small"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="example.json"
            helperText={tr('Name under which the file will be stored', '用于存储文件的名称')}
          />
          <TextField
            label={tr('Content', '内容')}
            size="small"
            fullWidth
            multiline
            minRows={4}
            maxRows={12}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={tr('File content here...', '在此输入文件内容...')}
            slotProps={{ input: { sx: { typography: 'body2', fontFamily: monospaceFontFamily } } }}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={newBase64}
                onChange={(e) => setNewBase64(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                {tr('Base64 encoded (server will decode before storing)', 'Base64 编码（服务器会在存储前解码）')}
              </Typography>
            }
          />
          <Button
            variant="contained"
            onClick={() => void handleStore()}
            disabled={storing || !newName.trim()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {storing ? tr('Storing...', '正在存储...') : tr('Store File', '存储文件')}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tr('Close', '关闭')}</Button>
      </DialogActions>
    </Dialog>
    <ConfirmDialog
      open={deleteTarget !== null}
      title={tr(`Delete "${deleteTarget}"?`, `删除“${deleteTarget}”？`)}
      message={tr('This permanently deletes the file from the server filesystem. This cannot be undone.', '这会从服务器文件系统中永久删除该文件，且无法撤销。')}
      confirmLabel={tr('Delete file', '删除文件')}
      onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }}
      onClose={() => setDeleteTarget(null)}
    />
    </>
  );
}
