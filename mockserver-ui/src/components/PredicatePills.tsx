import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import type { ConversationPredicates } from '../lib/llmTraffic';
import { useI18n, type TranslateInline } from '../i18n';

interface PredicatePillsProps {
  predicates: ConversationPredicates;
}

interface PillDef {
  key: string;
  label: string;
}

// Cap user-supplied values rendered in pill labels so a long regex source or
// substring (whether accidental or deliberately crafted) cannot break the
// dashboard layout. Chip labels are React nodes (not HTML), so this is a
// length-only concern — not an XSS one.
const MAX_PILL_VALUE_LENGTH = 60;

function truncate(value: string): string {
  if (value.length <= MAX_PILL_VALUE_LENGTH) return value;
  return value.substring(0, MAX_PILL_VALUE_LENGTH) + '…';
}

function buildPills(predicates: ConversationPredicates, tr: TranslateInline): PillDef[] {
  const pills: PillDef[] = [];

  // The turnIndex predicate is intentionally NOT rendered as a pill here —
  // the parent JsonListItem already shows a `turn N of M` ordering chip
  // derived from scenario state, which is more useful (it's always present
  // even when the turn matches via other predicates) and would be a
  // duplicate with this pill.
  if (predicates.latestMessageContains != null) {
    pills.push({
      key: 'latestMessageContains',
      label: tr(
        `latest msg ⊃ "${truncate(predicates.latestMessageContains)}"`,
        `最新消息 ⊃ "${truncate(predicates.latestMessageContains)}"`,
      ),
    });
  }
  if (predicates.latestMessageMatches != null) {
    pills.push({
      key: 'latestMessageMatches',
      label: tr(
        `latest msg ~ /${truncate(predicates.latestMessageMatches)}/`,
        `最新消息 ~ /${truncate(predicates.latestMessageMatches)}/`,
      ),
    });
  }
  if (predicates.latestMessageRole != null) {
    pills.push({
      key: 'latestMessageRole',
      label: tr(
        `latest role = ${predicates.latestMessageRole}`,
        `最新角色 = ${predicates.latestMessageRole}`,
      ),
    });
  }
  if (predicates.containsToolResultFor != null) {
    pills.push({
      key: 'containsToolResultFor',
      label: tr(
        `has tool_result for ${truncate(predicates.containsToolResultFor)}`,
        `包含 ${truncate(predicates.containsToolResultFor)} 的 tool_result`,
      ),
    });
  }
  if (predicates.semanticMatchAgainst != null) {
    // Flagged "exploratory" to match the wizard: this predicate is opt-in,
    // non-deterministic (LLM-judged), and never on the assertion path.
    pills.push({
      key: 'semanticMatchAgainst',
      label: tr(
        `semantic ≈ "${truncate(predicates.semanticMatchAgainst)}" (exploratory)`,
        `语义 ≈ "${truncate(predicates.semanticMatchAgainst)}"（探索性）`,
      ),
    });
  }
  if (predicates.normalization != null) {
    const n = predicates.normalization;
    const parts: string[] = [];
    if (n.collapseWhitespace) parts.push(tr('ws', '空白'));
    if (n.lowercase) parts.push(tr('lower', '小写'));
    if (n.sortJsonKeys) parts.push(tr('json-keys', 'JSON 键'));
    if (n.dropBuiltInVolatileFields) parts.push(tr('volatile', '易变字段'));
    if (n.dropVolatileFields && n.dropVolatileFields.length > 0) {
      parts.push(tr(`drop ${n.dropVolatileFields.length}`, `移除 ${n.dropVolatileFields.length} 个`));
    }
    pills.push({
      key: 'normalization',
      label: parts.length > 0
        ? tr(`normalised: ${parts.join(', ')}`, `已规范化：${parts.join('、')}`)
        : tr('normalised', '已规范化'),
    });
  }

  return pills;
}

export default function PredicatePills({ predicates }: PredicatePillsProps) {
  const { tr } = useI18n();
  const pills = buildPills(predicates, tr);
  if (pills.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {pills.map((pill) => (
        <Chip
          key={pill.key}
          label={pill.label}
          size="small"
          color="info"
          variant="outlined"
          sx={{ height: 22 }}
        />
      ))}
    </Box>
  );
}
