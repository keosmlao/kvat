import { t } from "@/lib/i18n/messages";
import { logoutAction } from "./actions";

const tm = (k: string) => t("lo", "manage", k);

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="ml-2 px-2 py-1 rounded text-slate-300 hover:bg-white/10 hover:text-white transition text-[12px]"
      >
        {tm("logoutBtn")}
      </button>
    </form>
  );
}
