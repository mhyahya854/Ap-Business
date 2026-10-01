import { notFound } from "next/navigation";
import { ReaderApp } from "@/components/reader/reader-app";
import { flattenContents } from "@/content/book2/contents";

const modules = flattenContents().filter((entry) => entry.type === "module");

export const dynamicParams = false;

export function generateStaticParams() {
  return modules.map((entry) => ({ module: entry.id }));
}

export default async function ModuleRoute({ params }: PageProps<"/modules/[module]">) {
  const { module } = await params;
  if (!modules.some((entry) => entry.id === module)) notFound();
  return <ReaderApp initialEntryId={module} />;
}
