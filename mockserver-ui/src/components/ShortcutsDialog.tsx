import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';

/**
 * Lists the global keyboard shortcuts. The list is the single source of truth for the
 * shortcut help and must stay in sync with `src/hooks/useKeyboardShortcuts.ts`:
 *   - ?                 -> open this keyboard-shortcuts help
 *   - Cmd/Ctrl+K        -> focus the log search field
 *   - Cmd/Ctrl+Shift+L  -> open the "clear server logs and recorded requests" confirmation
 *   - Cmd/Ctrl+Shift+F  -> toggle the request-filter panel
 */
const SHORTCUTS: { keys: string; en: string; zh: string }[] = [
  { keys: '?', en: 'Show this keyboard shortcuts help', zh: '显示键盘快捷键帮助' },
  { keys: '⌘K  /  Ctrl+K', en: 'Focus the log search field', zh: '聚焦日志搜索框' },
  { keys: '⌘⇧L  /  Ctrl+Shift+L', en: 'Clear server logs and recorded requests (asks for confirmation)', zh: '清除服务器日志和已记录请求（会要求确认）' },
  { keys: '⌘⇧F  /  Ctrl+Shift+F', en: 'Show / hide the request filter panel', zh: '显示或隐藏请求筛选面板' },
];

export default function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { tr } = useI18n();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={fullScreen} aria-labelledby="shortcuts-dialog-title">
      <DialogTitle id="shortcuts-dialog-title">{tr('Keyboard Shortcuts', '键盘快捷键')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr('Shortcuts are ignored while you are typing in a text field.', '在文本框中输入时不会触发快捷键。')}
        </Typography>
        <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 2, rowGap: 1, m: 0 }}>
          {SHORTCUTS.map((s) => (
            <Box key={s.keys} sx={{ display: 'contents' }}>
              <Typography
                component="dt"
                variant="body2"
                sx={{ fontFamily: monospaceFontFamily, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {s.keys}
              </Typography>
              <Typography component="dd" variant="body2" color="text.secondary" sx={{ m: 0 }}>
                {tr(s.en, s.zh)}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('Close', '关闭')}</Button>
      </DialogActions>
    </Dialog>
  );
}
