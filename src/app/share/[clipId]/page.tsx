import { SharedClipPage } from "@/components/shared-clip-page";

export default async function SharePage({ params }: { params: Promise<{ clipId: string }> }) {
  const { clipId } = await params;
  return <SharedClipPage clipId={clipId} />;
}
