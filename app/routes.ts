import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("add", "routes/add.tsx"),
  route("archive", "routes/archive.tsx"),
  route("bean/:beanId", "routes/bean.tsx"),
  route("settings", "routes/settings.tsx"),
  route("settings/templates/new", "routes/template-new.tsx"),
  route("settings/templates/:templateId/edit", "routes/template-edit.tsx"),
  route("theme", "routes/theme.ts"),
  route("images/:key", "routes/images.ts"),
] satisfies RouteConfig;
