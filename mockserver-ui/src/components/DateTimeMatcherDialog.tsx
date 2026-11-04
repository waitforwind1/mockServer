import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useI18n } from '../i18n';
import {
  dateTimeMatcherToWire,
  matcherFieldSeparator,
  matcherValueLine,
  type DateTimeOperator,
  type MatcherValueField,
} from '../lib/matcherValue';

const FIELDS: { value: MatcherValueField; label: string; zh: string }[] = [
  { value: 'headers', label: 'Header', zh: '请求头' },
  { value: 'queryString', label: 'Query Parameter', zh: '查询参数' },
  { value: 'cookies', label: 'Cookie', zh: 'Cookie' },
  { value: 'pathParams', label: 'Path Parameter', zh: '路径参数' },
];

const OPERATORS: { value: DateTimeOperator; label: string; zh: string }[] = [
  { value: 'before', label: 'Before', zh: '早于' },
  { value: 'after', label: 'After', zh: '晚于' },
  { value: 'equalToDateTime', label: 'Equal To Date-Time', zh: '等于日期时间' },
];

interface Draft {
  field: MatcherValueField;
  name: string;
  operator: DateTimeOperator;
  expected: string;
  actualFormat: string;
  truncateExpected: string;
  truncateActual: string;
  zone: string;
  applyTruncationLast: boolean;
  not: boolean;
}

function emptyDraft(field: MatcherValueField): Draft {
  return {
    field, name: '', operator: 'after', expected: '', actualFormat: '', truncateExpected: '',
    truncateActual: '', zone: '', applyTruncationLast: false, not: false,
  };
}

/**
 * Builds one date-time matcher line (e.g. `X-Issued-At: {"after":"now -1 hours"}`) and hands it
 * to `onAdd` for the chosen header / query / cookie / path-parameter field. Given `onAddBody`
 * instead, it builds the date-time comparison for a JSON Path / XPath body and hands over its
 * compact JSON (e.g. `{"after":"now -1 days"}`); there is then no field or name to choose.
 */
export default function DateTimeMatcherDialog({
  open,
  onClose,
  onAdd,
  onAddBody,
}: {
  open: boolean;
  onClose: () => void;
  onAdd?: (field: MatcherValueField, line: string) => void;
  onAddBody?: (json: string) => void;
}) {
  const { tr } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft('headers'));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const forBody = !!onAddBody;

  const name = draft.name.trim();
  const nameError = name.includes(matcherFieldSeparator(draft.field))
    ? tr(`Name cannot contain "${matcherFieldSeparator(draft.field)}"`, `名称不能包含“${matcherFieldSeparator(draft.field)}”`)
    : undefined;
  const canAdd = (forBody || (name !== '' && !nameError)) && draft.expected.trim() !== '';

  const add = () => {
    const value = dateTimeMatcherToWire({
      operator: draft.operator,
      expected: draft.expected.trim(),
      actualFormat: draft.actualFormat.trim(),
      truncateExpected: draft.truncateExpected.trim(),
      truncateActual: draft.truncateActual.trim(),
      zone: draft.zone.trim(),
      applyTruncationLast: draft.applyTruncationLast || undefined,
      not: draft.not,
    });
    if (onAddBody) onAddBody(JSON.stringify(value));
    else onAdd?.(draft.field, matcherValueLine(draft.field, name, value));
    setDraft(emptyDraft(draft.field));
    onClose();
  };

  const optional = (key: 'actualFormat' | 'truncateExpected' | 'truncateActual' | 'zone', label: string, placeholder: string) => (
    <TextField
      label={label}
      size="small"
      value={draft[key]}
      onChange={(e) => set(key, e.target.value)}
      placeholder={placeholder}
      sx={{ flex: 1, minWidth: 180 }}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="date-time-matcher-title">
      <DialogTitle id="date-time-matcher-title">{forBody ? tr('Body Date-Time Comparison', '请求体日期时间比较') : tr('Add Date-Time Matcher', '添加日期时间匹配器')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {tr('Match a value by comparing it as a date-time instead of as text. The expected value is', '将值按日期时间而不是文本进行比较。预期值可以是')} <code>now</code>、<code>now -1 hours</code>{tr(', or a date-time such as', '，或类似')} <code>2026-10-21T15:00:00Z</code>{tr('.', ' 的日期时间。')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
          {!forBody && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              label={tr('Field', '字段')}
              size="small"
              select
              value={draft.field}
              onChange={(e) => set('field', e.target.value as MatcherValueField)}
              sx={{ minWidth: 170 }}
            >
              {FIELDS.map((f) => <MenuItem key={f.value} value={f.value}>{tr(f.label, f.zh)}</MenuItem>)}
            </TextField>
            <TextField
              label={tr('Name', '名称')}
              size="small"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="X-Issued-At"
              error={!!nameError}
              helperText={nameError}
              sx={{ flex: 1, minWidth: 180 }}
            />
          </Box>}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              label={tr('Comparison', '比较方式')}
              size="small"
              select
              value={draft.operator}
              onChange={(e) => set('operator', e.target.value as DateTimeOperator)}
              sx={{ minWidth: 170 }}
            >
              {OPERATORS.map((o) => <MenuItem key={o.value} value={o.value}>{tr(o.label, o.zh)}</MenuItem>)}
            </TextField>
            <TextField
              label={tr('Expected Value', '预期值')}
              size="small"
              value={draft.expected}
              onChange={(e) => set('expected', e.target.value)}
              placeholder="now -1 hours"
              sx={{ flex: 1, minWidth: 180 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {optional('actualFormat', tr('Actual Format (optional)', '实际值格式（可选）'), 'rfc1123, epochSeconds, dd/MM/yyyy')}
            {optional('zone', tr('Zone (optional)', '时区（可选）'), 'Europe/London')}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {optional('truncateExpected', tr('Truncate Expected (optional)', '截断预期值（可选）'), 'startOfDay')}
            {optional('truncateActual', tr('Truncate Actual (optional)', '截断实际值（可选）'), 'first day of month')}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={draft.applyTruncationLast} onChange={(e) => set('applyTruncationLast', e.target.checked)} />}
              label={tr('Apply Truncation Last', '最后应用截断')}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={draft.not} onChange={(e) => set('not', e.target.checked)} />}
              label={tr('Not (Negate the Match)', 'Not（反转匹配）')}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('Cancel', '取消')}</Button>
        <Button variant="contained" disabled={!canAdd} onClick={add}>{forBody ? tr('Set', '设置') : tr('Add', '添加')}</Button>
      </DialogActions>
    </Dialog>
  );
}
