import Link from "next/link";

export type TrialInfo = {
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED" | string;
  trialEndsAt: Date | null;
  plan: string;
};

// Shown at the top of every tenant page when the tenant is still in trial.
// Disappears once /manage approves a YEARLY or LIFETIME plan.
export function TrialBanner({ info }: { info: TrialInfo }) {
  if (info.status !== "TRIAL" || !info.trialEndsAt) return null;

  const msLeft = info.trialEndsAt.getTime() - new Date().getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const expired = msLeft <= 0;
  const urgent = !expired && daysLeft <= 7;

  const cls = expired
    ? "bg-red-600 text-white"
    : urgent
    ? "bg-amber-500 text-white"
    : "o-trial-banner";

  return (
    <div className={`${cls} px-4 py-1.5 text-[12px] flex items-center justify-center gap-3`}>
      <span>
        {expired ? (
          <>⚠ ການທົດລອງໝົດແລ້ວ — ກະລຸນາສະໝັກແພັກເກດເພື່ອສືບຕໍ່ໃຊ້ງານ</>
        ) : (
          <>
            🎁 ໂໝດທົດລອງ — ເຫຼືອ <strong>{daysLeft} ວັນ</strong>
          </>
        )}
      </span>
      <Link
        href="/settings?section=about"
        className="underline underline-offset-2 hover:no-underline font-medium"
      >
        ສະໝັກແພັກເກດ →
      </Link>
    </div>
  );
}
