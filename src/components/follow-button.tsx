"use client";

import { toggleFollowAction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowButton({ creatorId, following }: { creatorId: string; following: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="btn btn-primary"
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await toggleFollowAction(creatorId);
          setPending(false);
          if (!result.ok) setError(result.error);
          else {
            setError("");
            router.refresh();
          }
        }}
      >
        {following ? "Following" : "Follow"}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
