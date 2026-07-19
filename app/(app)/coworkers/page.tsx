import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { CoworkerList } from "./coworker-list";

export const dynamic = "force-dynamic";

export default async function CoworkersPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_coworkers");

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Co-workers</span>
        <span className="crumb">WORKSPACE / CO-WORKERS</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">Co-workers</h1>
          </div>
        </div>

        <CoworkerList coworkers={data ?? []} />
      </div>
    </>
  );
}
