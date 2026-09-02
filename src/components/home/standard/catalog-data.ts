import { CATALOG_CATEGORIES } from "./categories";
import { CATALOG_TOOLS } from "./tools";
import { CatalogCategoryIdType, type CatalogCategory, type CatalogTool } from "./types";

export { CATALOG_CATEGORIES, CATALOG_TOOLS };
export { CatalogCategoryIdType } from "./types";

export function getCategoryById(id: CatalogCategoryIdType): CatalogCategory | undefined {
  return CATALOG_CATEGORIES.find((c) => c.id === id);
}

export function getToolsForCategory(categoryId: CatalogCategoryIdType): CatalogTool[] {
  if (categoryId === CatalogCategoryIdType.FunctionList) {
    return [...CATALOG_TOOLS];
  }
  return CATALOG_TOOLS.filter((t) => t.category === categoryId);
}

export function getToolById(toolId: string): CatalogTool | undefined {
  return CATALOG_TOOLS.find((t) => t.id === toolId);
}

export function getDefaultToolForCategory(
  categoryId: CatalogCategoryIdType,
): CatalogTool | undefined {
  const tools = getToolsForCategory(categoryId);
  return tools.find((t) => t.isPreferred) ?? tools[0];
}
