import { redirect } from "next/navigation";

export default async function MessageThreadRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/messages?id=${id}`);
}
