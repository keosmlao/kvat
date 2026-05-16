import { logoutAction } from "./actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="ml-2 px-2 py-1 rounded text-slate-300 hover:bg-white/10 hover:text-white transition text-[12px]"
      >
        ອອກ
      </button>
    </form>
  );
}
