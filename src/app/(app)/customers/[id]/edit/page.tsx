import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "../../customer-form";
import { updateCustomer, type CustomerFormState } from "../../actions";
import { Chatter } from "@/components/chatter";
import { getChatterData } from "@/lib/chatter";

export default async function EditCustomerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [customer, chatter, provinces, districts, villages] = await Promise.all(
    [
      prisma.customer.findUnique({ where: { id } }),
      getChatterData("customer", id),
      prisma.province.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.district.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, provinceId: true },
      }),
      prisma.village.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, districtId: true },
      }),
    ],
  );
  if (!customer) notFound();

  const action = async (prev: CustomerFormState, fd: FormData) => {
    "use server";
    return updateCustomer(id, prev, fd);
  };

  return (
    <CustomerForm
      action={action}
      initial={customer}
      provinces={provinces}
      districts={districts}
      villages={villages}
      chatter={
        <Chatter
          recordType="customer"
          recordId={id}
          revalidate={`/customers/${id}/edit`}
          messages={chatter.messages}
          activities={chatter.activities}
          followers={chatter.followers}
          users={chatter.users}
          isFollowing={chatter.isFollowing}
          currentUserId={chatter.currentUserId}
        />
      }
    />
  );
}
