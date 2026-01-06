// source.config.ts
import {
  defineCollections,
  defineConfig,
  frontmatterSchema,
  metaSchema
} from "fumadocs-mdx/config";
var docs = defineCollections({
  type: "doc",
  dir: "content/docs",
  schema: frontmatterSchema
});
var meta = defineCollections({
  type: "meta",
  dir: "content/docs",
  schema: metaSchema
});
var source_config_default = defineConfig();
export {
  source_config_default as default,
  docs,
  meta
};
