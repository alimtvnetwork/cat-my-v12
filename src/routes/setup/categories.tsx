import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/setup/categories")({
  staticData: { crumb: "Categories" },
  component: CategoriesLayout,
});

function CategoriesLayout() {
  return <Outlet />;
}
