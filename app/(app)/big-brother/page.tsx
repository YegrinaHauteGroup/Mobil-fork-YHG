import { requireUser } from "@/lib/auth";
import { BigBrotherSearch } from "./big-brother-search";

export const dynamic = "force-dynamic";

export default async function BigBrotherPage() {
  await requireUser();

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Big Brother</span>
        <span className="crumb">INTEGRATED SEARCH / BIG BROTHER</span>
      </div>
      <div className="content">
        <div className="page-head">
          <div>
            <h1 className="page-h">Big Brother</h1>
            <p className="page-sub">
              Unified search across papers (OpenAlex, Semantic Scholar) and code (GitHub). Add any
              result straight into Mobil.
            </p>
          </div>
        </div>
        <BigBrotherSearch />
      </div>
    </>
  );
}
