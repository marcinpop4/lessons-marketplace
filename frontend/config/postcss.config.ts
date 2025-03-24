import type { PluginCreator } from 'postcss';

interface PostCSSConfig {
  plugins: Record<string, Record<string, any> | boolean>;
}

const config: PostCSSConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config; 