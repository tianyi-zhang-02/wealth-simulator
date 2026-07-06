/**
 * i18n message catalog. Two locales: English and 简体中文.
 *
 * The Chinese copy is written natively — finance terms a Chinese speaker
 * actually uses (净资产 / 复利 / 税后收入 / 通胀 / 回撤 / 波动率), not a
 * word-for-word rendering of the English. When you add a string, add it to
 * BOTH `en` and `zh`; the `Messages` type (derived from `en`) makes a
 * missing Chinese key a compile error.
 *
 * No network, no library — this is a plain object bundled at build time.
 */

export type Locale = 'en' | 'zh';
export const LOCALES: readonly Locale[] = ['en', 'zh'] as const;

/** Human label for the language switcher (each shown in its own script). */
export const LOCALE_LABEL: Record<Locale, string> = { en: 'EN', zh: '中文' };

const en = {
  app: {
    // Brand name — intentionally NOT translated in either locale.
    title: 'Accretia',
    tagline:
      'Project net worth year by year from your own assumptions and watch it compound. Runs entirely in your browser — nothing is saved or sent anywhere. Use Export / Import to keep a scenario as a file.',
  },
  scenarioBar: {
    scenarioAria: 'Scenario',
    newScenario: '+ New',
    nameAria: 'Scenario name',
    duplicate: 'Duplicate',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    backToEditor: '← Back to editor',
    compare: 'Compare',
    remove: 'Remove',
    downloaded: 'Downloaded.',
    imported: 'Imported.',
    invalidScenario: 'That file is not a valid scenario.',
    unreadableFile: 'Could not read that file.',
    // Default names for freshly created / imported scenarios.
    defaultName: (n: number) => `Scenario ${n}`,
    copySuffix: (name: string) => `${name} (copy)`,
    importedName: 'Imported scenario',
  },
  projection: {
    assumptionsLabel: 'Assumptions',
    finalBalance: (year: number) => `Final balance · ${year}`,
    inTodaysDollars: (real: string, pct: string) => `${real} in today's dollars · ${pct} over horizon`,
    impliedSavings: (pct: string) => `Implied savings rate (year 1): ${pct} of after-tax income`,
    bandHeading: 'Projection · low–high band',
    nominal: 'Nominal',
    real: 'Real',
    computeError: 'Could not compute projection — check inputs.',
    bandCaption:
      'Band = pessimistic to optimistic return. Green dots are windfall years; red dots are major-expense years.',
  },
  table: {
    heading: 'Year by year',
    show: 'Show table',
    hide: 'Hide table',
  },
  footer: {
    disclaimer:
      'Estimates based on your assumptions. Not a prediction or financial advice. Career-role salaries in the role library are illustrative defaults, not market data — replace with your own figures.',
  },
};

/**
 * All locales must match the English shape. `en` is intentionally NOT `as
 * const` so its fields widen to `string` — the Chinese catalog matches the
 * shape (keys + value types) without having to reproduce exact literals.
 */
export type Messages = typeof en;

const zh: Messages = {
  app: {
    title: 'Accretia',
    tagline:
      '根据你自己的假设逐年推算净资产，见证复利的力量。全部运算都在本地浏览器完成——不保存、也不上传任何数据。用「导出／导入」把方案存成文件。',
  },
  scenarioBar: {
    scenarioAria: '方案',
    newScenario: '+ 新建',
    nameAria: '方案名称',
    duplicate: '复制',
    exportJson: '导出 JSON',
    importJson: '导入 JSON',
    backToEditor: '← 返回编辑',
    compare: '对比',
    remove: '删除',
    downloaded: '已下载。',
    imported: '已导入。',
    invalidScenario: '该文件不是有效的方案。',
    unreadableFile: '无法读取该文件。',
    defaultName: (n: number) => `方案 ${n}`,
    copySuffix: (name: string) => `${name}（副本）`,
    importedName: '导入的方案',
  },
  projection: {
    assumptionsLabel: '假设条件',
    finalBalance: (year: number) => `期末净资产 · ${year}`,
    inTodaysDollars: (real: string, pct: string) => `${real}（按今日购买力）· 期间累计 ${pct}`,
    impliedSavings: (pct: string) => `隐含储蓄率（第 1 年）：税后收入的 ${pct}`,
    bandHeading: '推算 · 悲观–乐观区间',
    nominal: '名义',
    real: '实际',
    computeError: '无法计算推算结果——请检查输入。',
    bandCaption: '区间表示从悲观到乐观的收益率。绿点为额外收入年份，红点为大额支出年份。',
  },
  table: {
    heading: '逐年明细',
    show: '显示表格',
    hide: '隐藏表格',
  },
  footer: {
    disclaimer:
      '结果基于你的假设估算，并非预测，也不构成投资建议。职业库中的薪资仅为示例默认值，而非市场数据——请替换为你自己的数字。',
  },
};

export const MESSAGES: Record<Locale, Messages> = { en, zh };
