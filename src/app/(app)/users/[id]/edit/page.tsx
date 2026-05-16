import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { UserForm } from "../../user-form";
import { updateUser, type UserFormState } from "../../actions";

export default async function EditUserPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await props.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const action = async (prev: UserFormState, fd: FormData) => {
    "use server";
    return updateUser(id, prev, fd);
  };

  return (
    <UserForm
      action={action}
      initial={{ email: user.email, name: user.name, role: user.role }}
    />
  );
}
