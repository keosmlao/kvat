import { requireAdmin } from "@/lib/session";
import { UserForm } from "../user-form";
import { createUser } from "../actions";

export default async function NewUserPage() {
  await requireAdmin();
  return <UserForm action={createUser} />;
}
