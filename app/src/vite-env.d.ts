/// <reference types="vite/client" />

// Allow raw text imports of the Cyber Samurai stylesheet (embedded at build time).
declare module "*.css?raw" {
  const css: string;
  export default css;
}
