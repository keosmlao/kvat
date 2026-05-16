"use client";

import { useActionState, useState, useTransition } from "react";
import {
  postMessage,
  createActivity,
  toggleActivityDone,
  deleteActivity,
  toggleFollow,
  type ChatterState,
} from "@/lib/chatter";

type MessageItem = {
  id: string;
  body: string;
  kind: "COMMENT" | "NOTE" | "LOG";
  createdAt: Date | string;
  author: { id: string; name: string; email: string };
};

type ActivityItem = {
  id: string;
  summary: string;
  note: string | null;
  dueDate: Date | string;
  done: boolean;
  doneAt: Date | string | null;
  assignedTo: { id: string; name: string };
  createdBy: { id: string; name: string };
};

type FollowerItem = {
  id: string;
  user: { id: string; name: string; email: string };
};

type UserItem = { id: string; name: string; email: string };

export function Chatter({
  recordType,
  recordId,
  revalidate,
  messages,
  activities,
  followers,
  users,
  isFollowing,
  currentUserId,
}: {
  recordType: string;
  recordId: string;
  revalidate: string;
  messages: MessageItem[];
  activities: ActivityItem[];
  followers: FollowerItem[];
  users: UserItem[];
  isFollowing: boolean;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"message" | "note" | "activity">("message");

  return (
    <div className="border-t border-gray-200 bg-gray-50/30">
      <div className="px-6 md:px-10 pt-3 pb-6">
        {/* Top toolbar: tabs + follow */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-0 text-[13px]">
            <ToolBtn active={tab === "message"} onClick={() => setTab("message")} icon="✉">
              ສົ່ງຂໍ້ຄວາມ
            </ToolBtn>
            <ToolBtn active={tab === "note"} onClick={() => setTab("note")} icon="📝">
              ບັນທຶກພາຍໃນ
            </ToolBtn>
            <ToolBtn
              active={tab === "activity"}
              onClick={() => setTab("activity")}
              icon="⏰"
              badge={activities.filter((a) => !a.done).length}
            >
              ກິດຈະກຳ
            </ToolBtn>
          </div>
          <FollowSection
            recordType={recordType}
            recordId={recordId}
            revalidate={revalidate}
            isFollowing={isFollowing}
            followers={followers}
          />
        </div>

        {/* Tab content */}
        {tab === "message" && (
          <MessageComposer
            kind="COMMENT"
            recordType={recordType}
            recordId={recordId}
            revalidate={revalidate}
          />
        )}
        {tab === "note" && (
          <MessageComposer
            kind="NOTE"
            recordType={recordType}
            recordId={recordId}
            revalidate={revalidate}
          />
        )}
        {tab === "activity" && (
          <ActivityComposer
            users={users}
            currentUserId={currentUserId}
            recordType={recordType}
            recordId={recordId}
            revalidate={revalidate}
          />
        )}

        {/* Active activities */}
        {activities.filter((a) => !a.done).length > 0 && (
          <div className="mt-4">
            <h4 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">
              ກິດຈະກຳທີ່ຄ້າງ
            </h4>
            <div className="space-y-1.5">
              {activities
                .filter((a) => !a.done)
                .map((a) => (
                  <ActivityRow key={a.id} item={a} revalidate={revalidate} />
                ))}
            </div>
          </div>
        )}

        {/* Activity log + messages timeline */}
        <Timeline messages={messages} activities={activities.filter((a) => a.done)} revalidate={revalidate} />
      </div>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  icon,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 border-b-2 transition flex items-center gap-1.5 ${
        active
          ? "border-[#b91c1c] text-[#b91c1c] font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      <span>{icon}</span>
      <span>{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#b91c1c] text-white text-[10px] font-semibold">
          {badge}
        </span>
      )}
    </button>
  );
}

function MessageComposer({
  kind,
  recordType,
  recordId,
  revalidate,
}: {
  kind: "COMMENT" | "NOTE";
  recordType: string;
  recordId: string;
  revalidate: string;
}) {
  const [state, formAction, pending] = useActionState<ChatterState, FormData>(
    postMessage,
    undefined,
  );
  const [body, setBody] = useState("");

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setBody("");
      }}
      className="space-y-2"
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="recordType" value={recordType} />
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="revalidate" value={revalidate} />
      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={
          kind === "NOTE"
            ? "ບັນທຶກພາຍໃນ (ລູກຄ້າບໍ່ເຫັນ)..."
            : "ຂໍ້ຄວາມສົ່ງໄປຫາລູກຄ້າ ຫລື ຜູ້ຕິດຕາມ..."
        }
        className={`w-full p-2 text-[13px] border rounded resize-none focus:outline-none focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/15 ${
          kind === "NOTE" ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-300"
        }`}
      />
      <div className="flex justify-between items-center">
        <div className="text-[11px] text-gray-500">
          {kind === "NOTE"
            ? "📒 ບັນທຶກພາຍໃນ — ສະເພາະພະນັກງານ"
            : "✉ ສົ່ງເປັນຂໍ້ຄວາມ + ແຈ້ງເຕືອນຜູ້ຕິດຕາມ"}
        </div>
        <div className="flex items-center gap-2">
          {state?.error && (
            <span className="text-[12px] text-red-600">{state.error}</span>
          )}
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="bg-[#b91c1c] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50"
          >
            {pending ? "..." : kind === "NOTE" ? "ບັນທຶກ" : "ສົ່ງ"}
          </button>
        </div>
      </div>
    </form>
  );
}

function ActivityComposer({
  users,
  currentUserId,
  recordType,
  recordId,
  revalidate,
}: {
  users: UserItem[];
  currentUserId: string;
  recordType: string;
  recordId: string;
  revalidate: string;
}) {
  const [state, formAction, pending] = useActionState<ChatterState, FormData>(
    createActivity,
    undefined,
  );
  const [summary, setSummary] = useState("");

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setSummary("");
      }}
      className="bg-white border border-gray-300 rounded p-3 space-y-2"
    >
      <input type="hidden" name="recordType" value={recordType} />
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="revalidate" value={revalidate} />
      <input
        name="summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        required
        placeholder="ຫົວຂໍ້ກິດຈະກຳ ເຊັ່ນ: ໂທຕາມຊຳລະບິນ"
        className="w-full p-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-[#b91c1c]"
      />
      <textarea
        name="note"
        rows={2}
        placeholder="ລາຍລະອຽດ (optional)..."
        className="w-full p-1.5 text-[13px] border border-gray-300 rounded resize-none focus:outline-none focus:border-[#b91c1c]"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">
            ກຳນົດສົ່ງ
          </label>
          <input
            type="date"
            name="dueDate"
            required
            defaultValue={tomorrow}
            className="w-full p-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-[#b91c1c]"
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">
            ມອບໃຫ້
          </label>
          <select
            name="assignedToId"
            required
            defaultValue={currentUserId}
            className="w-full p-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-[#b91c1c]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-between items-center">
        {state?.error && (
          <span className="text-[12px] text-red-600">{state.error}</span>
        )}
        <div className="ml-auto">
          <button
            type="submit"
            disabled={pending || !summary.trim()}
            className="bg-[#b91c1c] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50"
          >
            {pending ? "..." : "+ ສ້າງກິດຈະກຳ"}
          </button>
        </div>
      </div>
    </form>
  );
}

function FollowSection({
  recordType,
  recordId,
  revalidate,
  isFollowing,
  followers,
}: {
  recordType: string;
  recordId: string;
  revalidate: string;
  isFollowing: boolean;
  followers: FollowerItem[];
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const onToggle = () => {
    start(async () => {
      await toggleFollow(recordType, recordId, revalidate);
    });
  };

  return (
    <div className="flex items-center gap-2 relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={`text-[12px] px-2.5 py-1 rounded border transition flex items-center gap-1 ${
          isFollowing
            ? "bg-[#b91c1c]/10 border-[#b91c1c]/30 text-[#b91c1c]"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span>{isFollowing ? "✓" : "+"}</span>
        {isFollowing ? "ກຳລັງຕິດຕາມ" : "ຕິດຕາມ"}
      </button>
      {followers.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[12px] text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          <div className="flex -space-x-1.5">
            {followers.slice(0, 3).map((f) => (
              <span
                key={f.id}
                className="w-6 h-6 rounded-full bg-[#b91c1c]/10 text-[#b91c1c] flex items-center justify-center text-[10px] font-semibold border-2 border-white"
                title={f.user.name}
              >
                {f.user.name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <span>{followers.length} ຄົນຕິດຕາມ</span>
        </button>
      )}
      {open && followers.length > 0 && (
        <div className="absolute right-0 top-9 z-10 bg-white border border-gray-200 rounded shadow-lg min-w-[200px] py-1">
          {followers.map((f) => (
            <div key={f.id} className="px-3 py-1.5 text-[13px] text-gray-700">
              {f.user.name}{" "}
              <span className="text-[11px] text-gray-400">{f.user.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  item,
  revalidate,
}: {
  item: ActivityItem;
  revalidate: string;
}) {
  const [pending, start] = useTransition();
  const due = new Date(item.dueDate);
  const overdue = !item.done && due.getTime() < Date.now() - 86400000;
  const today = !item.done && due.toDateString() === new Date().toDateString();

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded border ${
        overdue
          ? "bg-red-50 border-red-200"
          : today
            ? "bg-amber-50 border-amber-200"
            : "bg-white border-gray-200"
      }`}
    >
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => {
          start(async () => {
            await toggleActivityDone(item.id, !item.done, revalidate);
          });
        }}
        disabled={pending}
        className="mt-1 accent-[#b91c1c]"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-[13px] text-gray-800">
            {item.summary}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!confirm("ລົບກິດຈະກຳນີ້?")) return;
              start(async () => {
                await deleteActivity(item.id, revalidate);
              });
            }}
            disabled={pending}
            className="text-gray-300 hover:text-red-600 text-sm leading-none"
            title="ລົບ"
          >
            ×
          </button>
        </div>
        {item.note && (
          <div className="text-[12px] text-gray-600 mt-0.5">{item.note}</div>
        )}
        <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-500">
          <span
            className={
              overdue
                ? "text-red-600 font-medium"
                : today
                  ? "text-amber-600 font-medium"
                  : ""
            }
          >
            ⏰{" "}
            {due.toLocaleDateString("lo-LA", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {overdue && " (ເລີຍກຳນົດ)"}
            {today && " (ມື້ນີ້)"}
          </span>
          <span>👤 {item.assignedTo.name}</span>
        </div>
      </div>
    </div>
  );
}

function Timeline({
  messages,
  activities,
  revalidate: _revalidate,
}: {
  messages: MessageItem[];
  activities: ActivityItem[];
  revalidate: string;
}) {
  // Merge messages + completed activities into single timeline
  type Entry =
    | { kind: "message"; ts: Date; data: MessageItem }
    | { kind: "activity-done"; ts: Date; data: ActivityItem };
  const entries: Entry[] = [
    ...messages.map((m) => ({
      kind: "message" as const,
      ts: new Date(m.createdAt),
      data: m,
    })),
    ...activities
      .filter((a) => a.done && a.doneAt)
      .map((a) => ({
        kind: "activity-done" as const,
        ts: new Date(a.doneAt!),
        data: a,
      })),
  ].sort((a, b) => b.ts.getTime() - a.ts.getTime());

  if (entries.length === 0) {
    return (
      <div className="mt-4 text-center text-[12px] text-gray-400 py-4">
        ຍັງບໍ່ມີຂໍ້ຄວາມ ຫລື ກິດຈະກຳ
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {entries.map((e) => {
        if (e.kind === "message") {
          const m = e.data;
          return (
            <div key={`m-${m.id}`} className="flex gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#b91c1c]/10 text-[#b91c1c] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                {m.author.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-[13px] text-gray-800">
                    {m.author.name}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatRelative(new Date(m.createdAt))}
                  </span>
                  {m.kind === "NOTE" && (
                    <span className="text-[10px] uppercase tracking-wider text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-200">
                      ບັນທຶກພາຍໃນ
                    </span>
                  )}
                </div>
                <div
                  className={`mt-0.5 text-[13px] whitespace-pre-wrap p-2 rounded ${
                    m.kind === "NOTE"
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            </div>
          );
        }
        // activity-done
        const a = e.data;
        return (
          <div key={`a-${a.id}`} className="flex gap-2.5 text-[12px] text-gray-500">
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[11px] flex-shrink-0 border border-emerald-200">
              ✓
            </span>
            <div className="flex-1 pt-1.5">
              <span className="text-gray-700">{a.assignedTo.name}</span>
              <span> ໄດ້ເຮັດກິດຈະກຳ </span>
              <span className="text-gray-800 font-medium">
                &ldquo;{a.summary}&rdquo;
              </span>
              <span className="text-gray-400 ml-1">
                — {formatRelative(e.ts)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatRelative(d: Date) {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "ໃໝ່ໆ";
  if (diff < 3600) return `${Math.floor(diff / 60)} ນາທີຜ່ານມາ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ຊົ່ວໂມງຜ່ານມາ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ມື້ຜ່ານມາ`;
  return d.toLocaleDateString("lo-LA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
