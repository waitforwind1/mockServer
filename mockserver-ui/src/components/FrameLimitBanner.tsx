import Alert from '@mui/material/Alert';
import { useDashboardStore } from '../store';
import { useI18n } from '../i18n';

interface FrameLimitBannerProps {
  /** Traffic shows no log messages, so only a cut in the request rows concerns it. */
  view: 'dashboard' | 'traffic';
}

/**
 * Shown while the server's latest update reached its size limit, naming what was left out. Log
 * messages may use only part of an update, so they can be cut while every request row still fits.
 */
export default function FrameLimitBanner({ view }: FrameLimitBannerProps) {
  const { tr } = useI18n();
  const requestsCut = useDashboardStore((s) => s.frameLimitReached);
  const logMessagesCut = useDashboardStore((s) => s.logMessagesLimitReached) && view === 'dashboard';
  if (!requestsCut && !logMessagesCut) return null;
  const what = requestsCut && logMessagesCut
    ? tr('Older requests and log messages are', '较早的请求和日志消息')
    : requestsCut
      ? tr('Older requests are', '较早的请求')
      : tr('Older log messages are', '较早的日志消息');
  return (
    <Alert severity="info" role="status" sx={{ mx: 1, mt: 1, flexShrink: 0 }} data-testid="frame-limit-banner">
      {tr(
        `${what} not shown: the latest update reached its size limit.`,
        `${what}未显示：最新更新已达到大小限制。`,
      )}{' '}
      {requestsCut
        ? tr(
            'Recent requests, with their bodies and log messages, filled it.',
            '近期请求及其正文和日志消息已占满可用空间。',
          )
        : tr(
            'Recent requests logged more than it has room for; for example, a request that matches no expectation logs a message for each expectation it was compared with.',
            '近期请求产生的日志超出可用空间；例如，一个未匹配任何期望的请求会为每个参与比较的期望记录一条消息。',
          )}
      {' '}{tr('Filter the requests, or clear the log, to see older ones.', '筛选请求或清除日志，以查看更早的内容。')}
    </Alert>
  );
}
