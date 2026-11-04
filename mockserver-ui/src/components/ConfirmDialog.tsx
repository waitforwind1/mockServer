import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useI18n } from '../i18n';

/**
 * Reusable confirmation dialog for destructive / irreversible actions (reset, bulk clear,
 * delete). Rendered controlled: the parent holds `open` and supplies `onConfirm`/`onClose`.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { tr } = useI18n();
  const resolvedConfirmLabel = confirmLabel ?? tr('Confirm', '确认');
  const resolvedCancelLabel = cancelLabel ?? tr('Cancel', '取消');
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText variant="body2">{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{resolvedCancelLabel}</Button>
        <Button
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          autoFocus
        >
          {resolvedConfirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
