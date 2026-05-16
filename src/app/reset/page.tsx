import { ResetForm } from "./reset-form";

type SP = Promise<{ token?: string }>;

export default async function ResetPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-[#b91c1c] items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">
            ຕັ້ງລະຫັດຜ່ານໃໝ່
          </h1>
        </div>
        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          {token ? (
            <ResetForm token={token} />
          ) : (
            <p className="text-[13px] text-red-600">
              ບໍ່ມີ token ໃນ URL — ກະລຸນາໃຊ້ລິ້ງຈາກ email
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
