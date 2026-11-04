import Box from '@mui/material/Box';
import {
  EVENT_LOG_LOSS_ALTERNATIVES,
  EVENT_LOG_LOSS_LEAD,
  eventLogLossCauses,
  type EventLogLoss,
} from '../lib/eventLogLoss';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';

/**
 * Shown inside a failed-verification log entry when the verification could not
 * be trusted because the event log was incomplete: which bound was reached, how
 * many entries were lost to it, and the setting to change. It is the same
 * information the REST client gets in the verification failure message.
 */
interface EventLogLossDetailsProps {
  loss: EventLogLoss;
}

export default function EventLogLossDetails({ loss }: EventLogLossDetailsProps) {
  const { locale, tr } = useI18n();
  const causes = eventLogLossCauses(loss);
  const chineseCause = (id: string): string => {
    if (id === 'ring-full') {
      const count = (loss.droppedRingFull ?? 0).toLocaleString();
      return `${count} 个日志事件因环形缓冲区已满而在记录前被丢弃（日志事件到达速度超过单个日志线程的记录速度）。如果在稳定负载下持续丢弃，请降低日志级别（例如 WARN），或保留日志级别并设置 maxLoggedMatchFailures（例如 10）以限制每个请求记录的未匹配条目；增大 ringBufferSize 只能吸收短时突发。`;
    }
    if (id === 'in-flight-bytes') {
      const count = (loss.droppedInFlightBytes ?? 0).toLocaleString();
      const budget = loss.inFlightBytesBudget === undefined ? '' : ` ${loss.inFlightBytesBudget.toLocaleString()} 字节的`;
      return `${count} 个日志事件因等待记录的请求和响应正文超过${budget}传输中字节预算（maxEventLogSizeInBytes 与堆派生上限中的较大值）而在记录前被丢弃。请降低日志级别；如果堆内存充足，也可将 maxEventLogSizeInBytes 提高到该预算以上。maxLoggedBodyBytes 无法解决此问题：它只会在正文离开此积压队列后截短正文。`;
    }
    if (id === 'max-log-entries') {
      const count = (loss.evictedAtMaxLogEntries ?? 0).toLocaleString();
      const setting = loss.maxLogEntries === undefined ? 'maxLogEntries' : `maxLogEntries=${loss.maxLogEntries}`;
      return `${count} 个已记录条目在日志达到最大条目数（${setting}）后被逐出。请提高 maxLogEntries，或降低日志级别以减少每个请求记录的条目数，或保留日志级别并设置 maxLoggedMatchFailures（例如 10）。`;
    }
    const count = (loss.evictedAtMaxEventLogSizeInBytes ?? 0).toLocaleString();
    const setting = loss.maxEventLogSizeInBytes === undefined
      ? 'maxEventLogSizeInBytes'
      : `maxEventLogSizeInBytes=${loss.maxEventLogSizeInBytes}`;
    return `${count} 个已记录条目在日志达到最大字节数（${setting}）后被逐出。请提高 maxEventLogSizeInBytes，或设置 maxLoggedBodyBytes 以截短大型正文，使每个已记录条目更小。`;
  };
  return (
    <Box
      role="note"
      aria-label={tr('What the event log lost and how to fix it', '事件日志丢失了什么以及如何修复')}
      data-testid="event-log-loss"
      sx={{
        // a log row does not wrap; this is prose, so it must
        whiteSpace: 'normal',
        maxWidth: '110ch',
        mt: 0.5,
        ml: 0.5,
        pl: 1,
        borderLeft: 2,
        borderColor: 'warning.main',
        color: 'text.primary',
        fontFamily: monospaceFontFamily,
      }}
    >
      {tr(
        EVENT_LOG_LOSS_LEAD,
        '无法证明请求从未发生：匹配的请求可能已被丢弃。自上次重置事件日志以来：',
      )}
      <Box component="ul" sx={{ my: 0.5, pl: 2.5 }}>
        {causes.map((cause) => (
          <li key={cause.id} data-testid={`event-log-loss-${cause.id}`}>
            {locale === 'zh-CN' ? chineseCause(cause.id) : `${cause.lost} ${cause.fix}`}
          </li>
        ))}
      </Box>
      {tr(
        EVENT_LOG_LOSS_ALTERNATIVES,
        '也可以在测试之间重置事件日志，或设置 failVerificationOnEvictedLog=false 以恢复以前（不可靠）的行为。',
      )}
    </Box>
  );
}
