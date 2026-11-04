import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getLocale,
  I18nProvider,
  LOCALE_STORAGE_KEY,
  translate,
  useI18n,
} from '../i18n';

function LocaleProbe() {
  const { locale, setLocale, tr } = useI18n();
  return (
    <div>
      <span>{locale}</span>
      <span>{tr('English copy', '中文文案')}</span>
      <button type="button" onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')}>
        switch
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.removeItem(LOCALE_STORAGE_KEY);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('I18nProvider', () => {
  it('selects Chinese for a Chinese browser on first use', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-TW');
    render(<I18nProvider><LocaleProbe /></I18nProvider>);

    expect(screen.getByText('zh-CN')).toBeInTheDocument();
    expect(screen.getByText('中文文案')).toBeInTheDocument();
  });

  it('uses a persisted locale before the browser language', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN');
    render(<I18nProvider><LocaleProbe /></I18nProvider>);

    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('English copy')).toBeInTheDocument();
  });

  it('persists switches and synchronises non-React translation helpers', async () => {
    const user = userEvent.setup();
    render(<I18nProvider initialLocale="en"><LocaleProbe /></I18nProvider>);

    await user.click(screen.getByRole('button', { name: 'switch' }));

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-CN');
    expect(getLocale()).toBe('zh-CN');
    expect(translate('Utility message', '工具消息')).toBe('工具消息');
  });
});
