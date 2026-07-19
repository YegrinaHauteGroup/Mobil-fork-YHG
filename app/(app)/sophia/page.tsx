import { requireUser } from "@/lib/auth";
import { listConversations } from "./actions";
import { SophiaChat } from "./sophia-chat";

export const dynamic = "force-dynamic";

export default async function SophiaPage() {
  await requireUser();
  const conversations = await listConversations();

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Sophia</span>
        <span className="crumb">AI ASSISTANT / SOPHIA</span>
      </div>
      <SophiaChat initialConversations={conversations} />
    </>
  );
}
