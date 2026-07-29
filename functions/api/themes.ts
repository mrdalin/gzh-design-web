// GET /api/themes
// 返回已注册主题列表（解析自 theme-index.md），前端据此渲染快捷选择，无需打包整个 skill 资产。

import { parseThemes } from '../../worker-lib/themes';

export const onRequestGet = () => {
  const themes = parseThemes().map((t) => ({
    id: t.id,
    name: t.name,
    mainColor: t.mainColor,
    scenario: t.scenario,
    underlineCss: t.underlineCss,
  }));
  return new Response(JSON.stringify({ themes }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
};
