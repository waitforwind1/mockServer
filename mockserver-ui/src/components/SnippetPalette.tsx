/**
 * SnippetPalette — a popover menu of curated template snippets that can be
 * inserted into the Composer's template body field.
 *
 * The palette is engine-aware: it shows the correct Velocity / Mustache /
 * JavaScript syntax for each snippet based on the currently selected template
 * engine. Each snippet also shows a short description and an example rendering.
 */
import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import type { TemplateEngine } from '../lib/templateSnippets';
import { SNIPPET_CATEGORIES } from '../lib/templateSnippets';
import { monospaceFontFamily } from '../theme';
import { useI18n } from '../i18n';

interface SnippetPaletteProps {
  /** The currently selected template engine — determines which syntax to show and insert. */
  engine: TemplateEngine;
  /** Called when the user clicks a snippet; receives the engine-specific syntax string. */
  onInsert: (snippet: string) => void;
}

export default function SnippetPalette({ engine, onInsert }: SnippetPaletteProps) {
  const { tr } = useI18n();
  const snippetText = (id: string, english: string, category = false, description = false) => {
    const categories: Record<string, string> = { 'request-echoes': '请求回显', 'dynamic-data': '动态数据', structure: '结构' };
    const labels: Record<string, string> = { 'req-method': '请求方法', 'req-path': '请求路径', 'req-body': '请求体', 'req-header': '请求头', 'req-query': '查询参数', 'req-path-param': '路径参数', 'req-cookie': '请求 Cookie', uuid: 'UUID', 'now-iso': '时间戳（ISO 8601）', 'now-epoch': '时间戳（Epoch 秒）', 'now-rfc1123': '时间戳（RFC 1123）', 'rand-int': '随机整数（0-9）', 'rand-int-100': '随机整数（0-99）', 'faker-name': '虚构姓名', 'faker-email': '虚构邮箱', 'json-skeleton': 'JSON 响应骨架', conditional: '条件分支（if / else）', 'loop-headers': '遍历请求头' };
    if (category) return tr(english, categories[id] ?? english);
    if (!description) return tr(english, labels[id] ?? english);
    const descriptions: Record<string, string> = { 'req-method': '回显传入请求的 HTTP 方法。', 'req-path': '回显传入请求的路径。', 'req-body': '以字符串回显完整请求体。', 'req-header': '回显指定请求头的第一个值；请将 host 替换为请求头名称。', 'req-query': '回显指定查询参数；请将 id 替换为参数名称。', 'req-path-param': '回显路径参数；请将 userId 替换为参数名称。', 'req-cookie': '回显指定 Cookie 值；请将 session 替换为 Cookie 名称。', uuid: '生成随机 UUID (v4)。', 'now-iso': 'ISO 8601 格式的当前日期时间。', 'now-epoch': 'Unix Epoch 秒格式的当前时间。', 'now-rfc1123': 'RFC 1123 格式的当前日期时间。', 'rand-int': '0 到 9 之间的随机整数。', 'rand-int-100': '0 到 99 之间的随机整数。', 'faker-name': '通过 Datafaker 生成随机名字。', 'faker-email': '通过 Datafaker 生成随机邮箱地址。', 'json-skeleton': '回显方法、路径和请求体的完整 JSON 响应模板。', conditional: '根据请求方法返回不同响应。', 'loop-headers': '遍历所有请求头并将其包含在响应中。' };
    return tr(english, descriptions[id] ?? english);
  };
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleInsert = useCallback(
    (syntax: string) => {
      onInsert(syntax);
      handleClose();
    },
    [onInsert, handleClose],
  );

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={handleOpen}
        aria-label={tr('Insert snippet', '插入代码片段')}
        sx={{ textTransform: 'none', fontSize: '0.78rem' }}
      >
        {tr('Insert snippet', '插入代码片段')}
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            // Cap the width to the viewport (less a small margin) so the popover
            // never overflows on a narrow phone (e.g. 375px), while keeping the
            // comfortable 440px on wider screens.
            sx: { maxHeight: 420, width: 'min(440px, calc(100vw - 32px))', overflow: 'auto' },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="subtitle2">
            {tr('Template Snippets', '模板代码片段')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {tr(`Click a snippet to insert ${engine === 'VELOCITY' ? 'Velocity' : engine === 'MUSTACHE' ? 'Mustache' : 'JavaScript'} syntax`, `点击代码片段以插入 ${engine === 'VELOCITY' ? 'Velocity' : engine === 'MUSTACHE' ? 'Mustache' : 'JavaScript'} 语法`)}
          </Typography>
        </Box>

        {SNIPPET_CATEGORIES.map((category, catIdx) => (
          <Box key={category.id}>
            {catIdx > 0 && <Divider />}
            <Typography
              variant="overline"
              sx={{ px: 2, pt: 1, pb: 0.5, display: 'block', lineHeight: 1.5 }}
            >
              {snippetText(category.id, category.label, true)}
            </Typography>
            <List dense disablePadding>
              {category.snippets.map((snippet) => {
                const syntax = snippet.syntax[engine];
                return (
                  <ListItemButton
                    key={snippet.id}
                    onClick={() => handleInsert(syntax)}
                    sx={{ py: 0.5, px: 2, alignItems: 'flex-start' }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {snippetText(snippet.id, snippet.label)}
                          </Typography>
                          <Chip
                            label={syntax}
                            size="small"
                            sx={{
                              fontFamily: monospaceFontFamily,
                              fontSize: '0.7rem',
                              height: 20,
                              maxWidth: 220,
                              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {snippetText(snippet.id, snippet.description, false, true)}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{
                              fontFamily: monospaceFontFamily,
                              color: 'success.main',
                              mt: 0.25,
                            }}
                          >
                            {snippet.exampleOutput.length > 60
                              ? snippet.exampleOutput.slice(0, 57) + '...'
                              : snippet.exampleOutput}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Popover>
    </>
  );
}
