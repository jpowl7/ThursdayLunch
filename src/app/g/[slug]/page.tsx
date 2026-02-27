import { EventPageContent } from "@/components/EventPageContent";

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventPageContent groupSlug={slug} />;
}
