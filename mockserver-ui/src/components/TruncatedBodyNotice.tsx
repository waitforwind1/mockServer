import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { SxProps, Theme } from '@mui/material/styles';
import type { TruncatedBody } from '../types';
import { formatCharacters, isLoadable } from '../lib/fullBody';
import { humanizeError, type HumanError } from '../lib/errorMessage';
import HumanErrorAlert from './HumanErrorAlert';
import { useI18n } from '../i18n';

interface TruncatedBodyNoticeProps {
  marker: TruncatedBody;
  /** Loads the whole body; omitted when it cannot be loaded (an expectation in a log message). */
  onLoad?: () => Promise<void>;
  sx?: SxProps<Theme>;
}

function formatCharactersZh(length: number): string {
  if (length >= 1024 * 1024) return `${(length / (1024 * 1024)).toFixed(1)} MiB`;
  if (length >= 1024) return `${Math.round(length / 1024)} KiB`;
  return `${length} 个字符`;
}

/** Says a body was shortened in the live update, with a button that loads it whole. */
export default function TruncatedBodyNotice({ marker, onLoad, sx }: TruncatedBodyNoticeProps) {
  const { tr } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HumanError | null>(null);

  const load = async () => {
    if (!onLoad) return;
    setLoading(true);
    setError(null);
    try {
      await onLoad();
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const loadable = !!onLoad && isLoadable(marker);
  return (
    <>
      <Alert
        severity="info"
        variant="outlined"
        sx={{ py: 0, my: 0.5, ...(sx as object) }}
        data-testid="truncated-body-notice"
        action={loadable ? (
          <Button
            size="small"
            onClick={load}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={12} /> : undefined}
            data-testid="load-full-body"
          >
            {tr('Load Full Body', '加载完整正文')}
          </Button>
        ) : undefined}
      >
        {tr(
          `Body shortened: showing the first ${formatCharacters(marker.shownLength)} of ${formatCharacters(marker.originalLength)}.`,
          `正文已截短：共 ${formatCharactersZh(marker.originalLength)}，当前显示前 ${formatCharactersZh(marker.shownLength)}。`,
        )}
      </Alert>
      {error && <HumanErrorAlert error={error} sx={{ my: 0.5 }} />}
    </>
  );
}
