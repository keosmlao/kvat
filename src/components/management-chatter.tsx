"use client";

import { useActionState, useState, useTransition } from "react";
import { t } from "@/lib/i18n/messages";
import {
  createManagementActivity,
  deleteManagementActivity,
  postManagementMessage,
  toggleManagementActivityDone,
  toggleManagementFollow,
  type ManagementChatterState,
} from "@/lib/management-chatter";

const tc = (k: string) => t("lo", "chatter", k);

type MessageItem = {
  id: string;
  body: string;
  kind: string;
  createdAt: Date | string;
  author: { id: string; name: string; email: string };
};

type FollowerItem = {
  id: string;
  user: { id: string; name: string; email: string };
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

type UserItem = { id: string; name: string; email: string };

function getTodayDate() {
  return new Date();
}

export function ManagementChatter({
  recordType,
  recordId,
  revalidate,
  messages,
  followers,
  activities,
  users,
  isFollowing,
  currentUserId,
}: {
  recordType: string;
  recordId: string;
  revalidate: string;
  messages: MessageItem[];
  followers: FollowerItem[];
  activities: ActivityItem[];
  users: UserItem[];
  isFollowing: boolean;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"COMMENT" | "NOTE" | "ACTIVITY">("COMMENT");
  const [pending, start] = useTransition();
  const openActivities = activities.filter((a) => !a.done);

  return (
    <div className="border-t border-gray-200 bg-gray-50/30">
      <div className="px-6 md:px-8 pt-3 pb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-0 text-[13px]">
            <ToolBtn active={tab === "COMMENT"} onClick={() => setTab("COMMENT")}>
              {tc("sendMessageTab")}
            </ToolBtn>
            <ToolBtn active={tab === "NOTE"} onClick={() => setTab("NOTE")}>
              {tc("internalNote")}
            </ToolBtn>
            <ToolBtn active={tab === "ACTIVITY"} onClick={() => setTab("ACTIVITY")}>
              {tc("activityTab")}
              {openActivities.length > 0 && (
                <span className="ml-1 rounded-full bg-[#875a7b]/10 px-1.5 text-[11px] text-[#875a7b]">
                  {openActivities.length}
                </span>
              )}
            </ToolBtn>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await toggleManagementFollow(recordType, recordId, revalidate);
              })
            }
            className={`px-2.5 py-1 rounded text-[12px] border ${
              isFollowing
                ? "bg-[#875a7b]/10 text-[#875a7b] border-[#875a7b]/20"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {isFollowing ? tc("followingNow") : tc("followBtn")} · {followers.length}
          </button>
        </div>

        {tab === "ACTIVITY" ? (
          <ActivityComposer
            users={users}
            currentUserId={currentUserId}
            recordType={recordType}
            recordId={recordId}
            revalidate={revalidate}
          />
        ) : (
          <Composer
            kind={tab}
            recordType={recordType}
            recordId={recordId}
            revalidate={revalidate}
          />
        )}

        {openActivities.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-widest text-gray-500">
              {tc("pendingActivities")}
            </h4>
            <div className="space-y-1.5">
              {openActivities.map((a) => (
                <ActivityRow key={a.id} item={a} revalidate={revalidate} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {messages.length === 0 && activities.filter((a) => a.done).length === 0 ? (
            <div className="text-[12px] text-gray-400 italic py-3">
              {tc("noChatter")}
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className="bg-white border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-medium text-gray-800">
                      {m.author.name}
                      <span className="ml-2 text-[11px] text-gray-400">
                        {m.kind === "NOTE" ? tc("internalNoteCap") : tc("commentCap")}
                      </span>
                    </div>
                    <time className="text-[11px] text-gray-400">
                      {formatDateTime(m.createdAt)}
                    </time>
                  </div>
                  <div className="mt-1 text-[13px] text-gray-700 whitespace-pre-wrap">
                    {m.body}
                  </div>
                </div>
              ))}
              {activities
                .filter((a) => a.done)
                .map((a) => (
                  <div
                    key={a.id}
                    className="rounded border border-emerald-100 bg-emerald-50/50 p-3 text-[13px]"
                  >
                    <div className="font-medium text-emerald-800">
                      ✓ {a.summary}
                    </div>
                    <div className="mt-0.5 text-[11px] text-emerald-700">
                      {tc("doneByPrefix")} {a.assignedTo.name}
                      {a.doneAt ? ` · ${formatDateTime(a.doneAt)}` : ""}
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Asia/Vientiane",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Composer({
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
  const [state, formAction, pending] = useActionState<
    ManagementChatterState,
    FormData
  >(postManagementMessage, undefined);
  const [body, setBody] = useState("");

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setBody("");
      }}
      className="bg-white border border-gray-300 rounded p-3 space-y-2"
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="recordType" value={recordType} />
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="revalidate" value={revalidate} />
      <textarea
        name="body"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={kind === "NOTE" ? tc("chatterNoteShort") : tc("chatterMsgPh")}
        className="w-full resize-none border-0 focus:ring-0 text-[13px] outline-none"
      />
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-red-600">{state?.error}</div>
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="bg-[#875a7b] text-white px-3 py-1 rounded text-[13px] disabled:opacity-50"
        >
          {pending ? tc("sending") : tc("sendBtn")}
        </button>
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
  const [state, formAction, pending] = useActionState<
    ManagementChatterState,
    FormData
  >(createManagementActivity, undefined);
  const [summary, setSummary] = useState("");
  const tomorrow = new Date(new Date().getTime() + 86400000)
    .toISOString()
    .slice(0, 10);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setSummary("");
      }}
      className="space-y-2 rounded border border-gray-300 bg-white p-3"
    >
      <input type="hidden" name="recordType" value={recordType} />
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="revalidate" value={revalidate} />
      <input
        name="summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        required
        placeholder={tc("chatterActivityPh")}
        className="w-full rounded border border-gray-300 p-1.5 text-[13px] outline-none focus:border-[#875a7b]"
      />
      <textarea
        name="note"
        rows={2}
        placeholder={tc("chatterDetailPh")}
        className="w-full resize-none rounded border border-gray-300 p-1.5 text-[13px] outline-none focus:border-[#875a7b]"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-0.5 block text-[11px] uppercase tracking-wider text-gray-500">
            {tc("chatterDueDate")}
          </label>
          <input
            type="date"
            name="dueDate"
            required
            defaultValue={tomorrow}
            className="w-full rounded border border-gray-300 p-1.5 text-[13px] outline-none focus:border-[#875a7b]"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] uppercase tracking-wider text-gray-500">
            {tc("chatterAssignTo")}
          </label>
          <select
            name="assignedToId"
            required
            defaultValue={currentUserId}
            className="w-full rounded border border-gray-300 p-1.5 text-[13px] outline-none focus:border-[#875a7b]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-red-600">{state?.error}</div>
        <button
          type="submit"
          disabled={pending || !summary.trim()}
          className="rounded bg-[#875a7b] px-3 py-1 text-[13px] text-white disabled:opacity-50"
        >
          {pending ? tc("creatingActivity") : tc("createActivityBtn")}
        </button>
      </div>
    </form>
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
  const today = getTodayDate();
  const overdue = !item.done && due.getTime() < today.getTime() - 86400000;
  const dueToday = !item.done && due.toDateString() === today.toDateString();

  return (
    <div
      className={`flex items-start gap-2 rounded border p-2 ${
        overdue
          ? "border-red-200 bg-red-50"
          : dueToday
            ? "border-amber-200 bg-amber-50"
            : "border-gray-200 bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={item.done}
        disabled={pending}
        onChange={() =>
          start(async () => {
            await toggleManagementActivityDone(item.id, !item.done, revalidate);
          })
        }
        className="mt-1 accent-[#875a7b]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[13px] font-medium text-gray-800">
            {item.summary}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(tc("deleteActivityConfirm"))) return;
              start(async () => {
                await deleteManagementActivity(item.id, revalidate);
              });
            }}
            className="text-sm leading-none text-gray-300 hover:text-red-600"
            title={tc("deleteTitle")}
          >
            ×
          </button>
        </div>
        {item.note && (
          <div className="mt-0.5 whitespace-pre-wrap text-[12px] text-gray-600">
            {item.note}
          </div>
        )}
        <div className="mt-1 text-[11px] text-gray-500">
          Due {new Date(item.dueDate).toLocaleDateString("en-GB")} ·{" "}
          {item.assignedTo.name}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 border-b-2 ${
        active
          ? "border-[#875a7b] text-[#875a7b] font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}
