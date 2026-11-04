import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SavingsIcon from '@mui/icons-material/Savings';
import BoltIcon from '@mui/icons-material/Bolt';
import { useState } from 'react';
import OpenApiImportDialog from './OpenApiImportDialog';
import type { ConnectionParams } from '../hooks/useConnectionParams';
import { useDashboardStore, type ViewMode } from '../store';
import { useI18n } from '../i18n';

interface OnboardingPanelProps {
  connectionParams: ConnectionParams;
}

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** Optional second CTA rendered as an outlined button alongside the primary one. */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

function ActionCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: ActionCardProps) {
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        // Wide enough that the longest title ("Performance Testing") stays on one
        // line; whole tiles wrap to the next row rather than being squeezed narrow
        // enough to wrap the heading. The maxWidth stops a lone wrapped tile from
        // stretching across the full row.
        flex: '1 1 200px',
        minWidth: 200,
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: 4,
          borderColor: 'primary.main',
        },
      })}
    >
      <CardContent sx={{ flex: 1, p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          {icon}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="caption" component="p" color="text.secondary" sx={{ lineHeight: 1.45 }}>
          {description}
        </Typography>
      </CardContent>
      <CardActions sx={{ px: 1.5, pb: 1.5, pt: 0, gap: 0.75 }}>
        <Button size="small" variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
        {secondaryActionLabel && onSecondaryAction && (
          <Button size="small" variant="outlined" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

export default function OnboardingPanel({ connectionParams }: OnboardingPanelProps) {
  const { t } = useI18n();
  const [openApiOpen, setOpenApiOpen] = useState(false);
  const setView = useDashboardStore((s) => s.setView);
  // The server's TOTAL expectation count. Falls back to the page length when the
  // server does not send a total — an older server, or the first frame before one
  // has arrived — so the count degrades to the old (capped) behaviour rather than
  // to a confident zero.
  const activeMockCount = useDashboardStore(
    (s) => s.activeExpectationsTotal || s.activeExpectations.length,
  );
  // Deliberately a PRESENCE flag, not a count. recordedRequests is a capped live
  // window, so its length pins at the cap and a sentence asserting "this server
  // has N recorded requests" becomes false on any busy server.
  const hasRecordedRequests = useDashboardStore((s) => s.recordedRequests.length > 0);
  const hasExistingState = activeMockCount > 0 || hasRecordedRequests;

  const go = (view: ViewMode) => () => setView(view);

  const otherTabs: { view: ViewMode; label: string; description: string }[] = [
    { view: 'dashboard', label: t('onboarding.other.dashboard.label'), description: t('onboarding.other.dashboard.description') },
    { view: 'library', label: t('onboarding.other.library.label'), description: t('onboarding.other.library.description') },
    { view: 'verification', label: t('onboarding.other.verification.label'), description: t('onboarding.other.verification.description') },
    { view: 'drift', label: t('onboarding.other.drift.label'), description: t('onboarding.other.drift.description') },
    { view: 'async', label: t('onboarding.other.async.label'), description: t('onboarding.other.async.description') },
    { view: 'metrics', label: t('onboarding.other.metrics.label'), description: t('onboarding.other.metrics.description') },
  ];

  // The six key features, rendered as tiles on wide screens and as a compact
  // bulleted list on narrow ones (mobile / the IDE-embedded dashboard).
  // Ordered to lead with the most common first task (Mocking) and otherwise
  // follow the AppBar tab order (Traffic, Breakpoints, Chaos, Performance,
  // LLM Optimise) so the onboarding and the navigation tell a consistent story.
  const primaryActions: ActionCardProps[] = [
    {
      icon: <UploadFileIcon color="primary" />,
      title: t('onboarding.feature.mocking.title'),
      description: t('onboarding.feature.mocking.description'),
      actionLabel: t('onboarding.feature.mocking.action'),
      onAction: go('composer'),
      secondaryActionLabel: t('onboarding.feature.mocking.secondary'),
      onSecondaryAction: () => setOpenApiOpen(true),
    },
    {
      icon: <SwapHorizIcon color="primary" />,
      title: t('onboarding.feature.proxy.title'),
      description: t('onboarding.feature.proxy.description'),
      actionLabel: t('onboarding.feature.proxy.action'),
      onAction: go('traffic'),
    },
    {
      icon: <PauseCircleIcon color="primary" />,
      title: t('onboarding.feature.breakpoints.title'),
      description: t('onboarding.feature.breakpoints.description'),
      actionLabel: t('onboarding.feature.breakpoints.action'),
      onAction: go('breakpoints'),
    },
    {
      icon: <BoltIcon color="primary" />,
      title: t('onboarding.feature.chaos.title'),
      description: t('onboarding.feature.chaos.description'),
      actionLabel: t('onboarding.feature.chaos.action'),
      onAction: go('chaos'),
    },
    {
      icon: <TrendingUpIcon color="primary" />,
      title: t('onboarding.feature.performance.title'),
      description: t('onboarding.feature.performance.description'),
      actionLabel: t('onboarding.feature.performance.action'),
      onAction: go('performance'),
    },
    {
      icon: <SavingsIcon color="primary" />,
      title: t('onboarding.feature.optimise.title'),
      description: t('onboarding.feature.optimise.description'),
      actionLabel: t('onboarding.feature.optimise.action'),
      onAction: go('optimise'),
    },
  ];

  return (
    <Box
      data-testid="onboarding-scroller"
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        p: 4,
        overflow: 'auto',
      }}
    >
      {/* Centred with auto margins, not justify-content: when the content is
          taller than the window, auto margins collapse to 0 and it overflows
          downwards into the scroll area instead of above its top edge. */}
      <Box
        data-testid="onboarding-content"
        sx={{ my: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        {t('onboarding.welcome')}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 640, textAlign: 'center' }}
      >
        {t('onboarding.intro')}
      </Typography>

      {/* Returning-user awareness: when this server already holds state, offer a
          jump straight to the Dashboard instead of the empty first-run flow. We
          surface it (never auto-redirect) so the user stays in control of the view. */}
      {hasExistingState && (
        <Alert
          severity="info"
          sx={{ mb: 3, maxWidth: 760, width: '100%' }}
          action={
            <Button color="inherit" size="small" onClick={go('dashboard')}>
              {t('onboarding.openDashboard')}
            </Button>
          }
        >
          {t('onboarding.existingMocks', {
            count: activeMockCount,
            suffix: activeMockCount === 1 ? '' : 's',
          })}
          {hasRecordedRequests ? t('onboarding.hasRecordedRequests') : ''}{t('onboarding.sentenceEnd')}
        </Alert>
      )}

      {/* Responsive switch keyed off the CONTAINER width, not the viewport. The
          dashboard is embedded in a narrow IDE tool window (JCEF) whose CSS
          viewport stays wide regardless of the visible panel size, so a viewport
          media query never fires there. A container query reacts to the actual
          panel width, so this behaves the same in a browser and in the IDE.
          Tiles are the default and only collapse to the bulleted list when the
          panel is narrow — so an engine without container-query support (older
          browsers, jsdom in tests) falls back to tiles rather than nothing. */}
      <Box sx={{ containerType: 'inline-size', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Wide panels: feature tiles side by side, wrapping to a second row when
            six no longer fit at their one-line-title minimum width rather than
            squeezing all six abreast (which wrapped the headings). */}
        <Box
          sx={{
            display: 'flex',
            '@container (max-width: 899.98px)': { display: 'none' },
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 1320,
          }}
        >
          {primaryActions.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </Box>

        {/* Narrow panels (mobile / IDE-embedded): a compact bulleted list, since
            six tiles side by side become unreadably squished. */}
        <Box
          component="ul"
          sx={{
            display: 'none',
            '@container (max-width: 899.98px)': { display: 'block' },
            m: 0,
            pl: 3,
            width: '100%',
            maxWidth: 760,
          }}
        >
          {primaryActions.map((action) => (
            <Box component="li" key={action.title} sx={{ mb: 1 }}>
              <Link
                component="button"
                type="button"
                onClick={action.onAction}
                sx={{ verticalAlign: 'baseline', fontWeight: 600 }}
              >
                {action.title}
              </Link>
              <Typography component="span" variant="body2" color="text.secondary">
                {' '}— {action.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ mt: 4, maxWidth: 760, width: '100%' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('onboarding.more')} {' '}
          <Link
            href="https://www.mock-server.com/mock_server/mockserver_ui.html"
            target="_blank"
            rel="noopener"
          >
            {t('onboarding.uiDocs')}
          </Link>
          {t('onboarding.moreSuffix')}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          {otherTabs.map((tab) => (
            <Box component="li" key={tab.view} sx={{ mb: 0.5 }}>
              <Link component="button" type="button" onClick={go(tab.view)} sx={{ verticalAlign: 'baseline' }}>
                {tab.label}
              </Link>
              <Typography component="span" variant="body2" color="text.secondary">
                {' '}— {tab.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      </Box>

      <OpenApiImportDialog
        open={openApiOpen}
        onClose={() => setOpenApiOpen(false)}
        connectionParams={connectionParams}
      />
    </Box>
  );
}
