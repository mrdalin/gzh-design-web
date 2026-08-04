// 全局共享类型定义。与 Cloudflare Pages Functions 返回结构保持一致。

export interface Theme {
  id: string;
  name: string;
  mainColor: string;
  scenario: string;
  underlineCss: string;
  componentLib?: string; // 主题组件库 HTML（客户端直连模式需要）
  commonComponents?: string; // 通用组件库（客户端直连模式需要，由前端从 /api/themes 获取后附加）
}

// 与 worker-lib/llm.ts 的 ModelConfig 对应
export interface ModelConfig {
  id?: string;
  displayName?: string;
  baseUrl: string; // 形如 https://api.deepseek.com/v1
  apiKey: string;
  model: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  leafCount: number;
}

export interface LayoutResult {
  html: string;
  title: string;
  validation: ValidationResult;
}

export interface HistoryItem {
  id: string;
  title: string;
  themeId: string;
  themeName: string;
  html: string;
  createdAt: number;
}

// 持久化到 localStorage 的模型（比 ModelConfig 多一个 id/preset 标记）
export interface StoredModel extends ModelConfig {
  id: string;
  preset?: boolean;
}
