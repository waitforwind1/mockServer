import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { describeTarget, pageOriginDashboardUrl, resolveUrlConnection, type UrlTargetField } from '../lib/connectionTarget';
import { useI18n } from '../i18n';

const FIELD_NAMES: Record<UrlTargetField, { en: string; zh: string }> = {
  host: { en: 'host', zh: '主机' },
  port: { en: 'port', zh: '端口' },
  basePath: { en: 'base path', zh: '基础路径' },
};

function listOf(names: string[], conjunction: string): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;
}

/**
 * Says when the dashboard link points the dashboard at a server on another host, and which
 * `?host=`, `?port=` or `?basePath=` values in it were invalid and so ignored, so a link never
 * silently retargets the dashboard.
 */
export default function UrlTargetNotice() {
  const { locale, tr } = useI18n();
  const [{ params, rejected, page, foreignHost }] = useState(resolveUrlConnection);
  const [dismissed, setDismissed] = useState(false);
  const fields = listOf(
    rejected.map((field) => FIELD_NAMES[field][locale === 'zh-CN' ? 'zh' : 'en']),
    tr('and', '和'),
  );
  return (
    <>
      {foreignHost && (
        <Alert
          severity="warning"
          sx={{ mx: 1, mt: 1, flexShrink: 0 }}
          data-testid="url-target-foreign-host"
          action={(
            <Button color="inherit" size="small" href={pageOriginDashboardUrl()}>
              {tr(`Use ${describeTarget(page)}`, `使用 ${describeTarget(page)}`)}
            </Button>
          )}
        >
          {tr(
            `This dashboard link points at ${describeTarget(params)}, not the server that served this page. Workspaces that follow the link show that server's data, and what you create or upload in them is sent there.`,
            `此仪表板链接指向 ${describeTarget(params)}，而不是提供本页面的服务器。跟随此链接的工作区会显示该服务器的数据，并将您创建或上传的内容发送到该服务器。`,
          )}
        </Alert>
      )}
      {rejected.length > 0 && !dismissed && (
        <Alert
          severity="warning"
          onClose={() => setDismissed(true)}
          sx={{ mx: 1, mt: 1, flexShrink: 0 }}
          data-testid="url-target-notice"
        >
          {tr(
            `The ${fields} in this dashboard link ${rejected.length === 1 ? 'is' : 'are'} not valid, so the dashboard ignored ${rejected.length === 1 ? 'it' : 'them'}; workspaces that follow the link use ${describeTarget(params)}.`,
            `此仪表板链接中的${fields}无效，因此已被忽略；跟随此链接的工作区将使用 ${describeTarget(params)}。`,
          )}
        </Alert>
      )}
    </>
  );
}
