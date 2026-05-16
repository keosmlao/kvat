import { redirect } from "next/navigation";

export default function ManageHomePage() {
  redirect("/manage/tenants");
}
