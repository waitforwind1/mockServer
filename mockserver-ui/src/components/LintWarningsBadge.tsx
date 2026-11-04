import { useState } from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import LintDialog from './LintDialog';
import { useI18n } from '../i18n';

/**
 * The `x-mockserver-lint-warnings` count from creating an expectation, as a chip that opens the
 * Lint Expectations dialog. Renders nothing for a count of 0.
 */
export default function LintWarningsBadge({ count, connectionParams }: { count: number; connectionParams: ConnectionParams }) {
  const { tr } = useI18n();
  const [open, setOpen] = useState(false);
  if (count <= 0) return null;
  return (
    <>
      <Tooltip describeChild title={tr('The expectation was stored, but lint found problems that may stop it matching. Click to see them.', '期望已保存，但静态检查发现可能导致其无法匹配的问题。点击查看。')}>
        <Chip
          size="small"
          color="warning"
          icon={<WarningAmberIcon />}
          label={tr(`${count} Lint ${count === 1 ? 'Warning' : 'Warnings'}`, `${count} 个静态检查警告`)}
          onClick={() => setOpen(true)}
          data-testid="lint-warnings-badge"
        />
      </Tooltip>
      {open && <LintDialog open onClose={() => setOpen(false)} connectionParams={connectionParams} />}
    </>
  );
}
