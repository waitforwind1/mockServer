import { translate } from '../i18n';

/**
 * Confirmation copy for "Clear Server Logs" (`PUT /mockserver/clear?type=log`), shared by the
 * Clear menu and the Cmd/Ctrl+Shift+L shortcut so the two prompts cannot drift apart. Recorded
 * requests live in the same server event log as the log messages, so clearing the log removes
 * them too; only expectations survive.
 */
export function clearLogsConfirmTitle(): string {
  return translate('Clear server logs?', '要清除服务器日志吗？');
}

export function clearLogsConfirmMessage(): string {
  return translate(
    'This removes the server log, including every recorded and proxied request and the log messages about them. Expectations are kept. This cannot be undone.',
    '这会删除服务器日志，包括所有已记录和已代理的请求及相关日志消息。期望会保留。此操作无法撤销。',
  );
}

export function clearLogsDoneMessage(): string {
  return translate('Server logs and recorded requests cleared', '服务器日志和已记录请求已清除');
}

// Backwards-compatible English defaults for consumers that read these values outside render.
export const CLEAR_LOGS_CONFIRM_TITLE = clearLogsConfirmTitle();
export const CLEAR_LOGS_CONFIRM_MESSAGE = clearLogsConfirmMessage();
export const CLEAR_LOGS_DONE_MESSAGE = clearLogsDoneMessage();
