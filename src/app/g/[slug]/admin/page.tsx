import { AdminPageContent } from "@/components/AdminPageContent";

export default async function GroupAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AdminPageContent groupSlug={slug} />;
}
