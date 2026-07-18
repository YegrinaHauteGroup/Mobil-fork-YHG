import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { FilesClient } from "./files-client";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const { userId } = await requireUser();
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("files")
    .select(
      "id, owner_id, storage_path, file_name, mime_type, size_bytes, is_public, created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Repository</span>
        <span className="crumb">WORKSPACE / REPOSITORY</span>
      </div>
      <div className="content">
        <FilesClient
          initialFiles={files ?? []}
          userId={userId}
        />
      </div>
    </>
  );
}
