import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getFeatures } from "@/lib/features";
import { OdooListPage } from "@/components/odoo/sheet";
import {
  createTodoTask,
  deleteTodoTask,
  moveTodoTask,
  updateTodoTask,
} from "./actions";

type Stage = "TODO" | "IN_PROGRESS" | "DONE";

const STAGES: { key: Stage; label: string; tone: string }[] = [
  { key: "TODO", label: "Todo", tone: "border-gray-200 bg-gray-50" },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    tone: "border-odoo/30 bg-odoo/10",
  },
  { key: "DONE", label: "Done", tone: "border-emerald-200 bg-emerald-50" },
];

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function priorityLabel(priority: number) {
  if (priority >= 2) return "Urgent";
  if (priority === 1) return "High";
  return "Normal";
}

function priorityClass(priority: number) {
  if (priority >= 2) return "bg-red-50 text-red-700 border-red-200";
  if (priority === 1) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-50 text-gray-600 border-gray-200";
}

function stageUrl(stage: string | undefined, q: string | undefined) {
  const sp = new URLSearchParams();
  if (stage) sp.set("stage", stage);
  if (q) sp.set("q", q);
  const query = sp.toString();
  return query ? `/todo?${query}` : "/todo";
}

export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const [session, features] = await Promise.all([requireUser(), getFeatures()]);
  if (!features.todo) redirect("/dashboard");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const stage = STAGES.some((s) => s.key === sp.stage)
    ? (sp.stage as Stage)
    : undefined;

  const [users, tasks] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.todoTask.findMany({
      where: {
        ...(stage ? { stage } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [
        { stage: "asc" },
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    }),
  ]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const counts = new Map<Stage, number>();
  for (const s of STAGES) counts.set(s.key, 0);
  for (const task of tasks) counts.set(task.stage, (counts.get(task.stage) ?? 0) + 1);

  return (
    <OdooListPage
      title="Todo"
      subtitle="Odoo-style personal and team tasks"
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <form action="/todo" className="flex items-end gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5">
                ຄົ້ນຫາ
              </label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search..."
                className="px-2 py-1 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-odoo"
              />
            </div>
            {stage && <input type="hidden" name="stage" value={stage} />}
            <button className="bg-odoo text-white px-3 py-1 rounded text-[13px] font-medium">
              Search
            </button>
          </form>
          <div className="flex items-center gap-1 text-[12px]">
            <FilterChip label="All" href={stageUrl(undefined, q)} active={!stage} />
            {STAGES.map((s) => (
              <FilterChip
                key={s.key}
                label={s.label}
                href={stageUrl(s.key, q)}
                active={stage === s.key}
              />
            ))}
          </div>
        </div>
      }
    >
      <>
        <div className="bg-white border border-gray-200 rounded mb-4">
          <div className="px-4 py-2 border-b border-gray-200 text-[12px] uppercase tracking-widest text-gray-500 font-medium">
            Quick Create
          </div>
          <form action={createTodoTask} className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_180px_150px_120px_auto] gap-2 items-start">
            <input
              name="title"
              required
              placeholder="ສິ່ງທີ່ຕ້ອງເຮັດ..."
              className="px-3 py-2 border border-gray-300 rounded text-[14px] focus:outline-none focus:border-odoo"
            />
            <select
              name="assignedToId"
              defaultValue={session.userId}
              className="px-3 py-2 border border-gray-300 rounded text-[13px] bg-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              name="dueDate"
              type="date"
              defaultValue={todayStr}
              className="px-3 py-2 border border-gray-300 rounded text-[13px]"
            />
            <select
              name="priority"
              defaultValue="0"
              className="px-3 py-2 border border-gray-300 rounded text-[13px] bg-white"
            >
              <option value="0">Normal</option>
              <option value="1">High</option>
              <option value="2">Urgent</option>
            </select>
            <button className="bg-odoo hover:bg-odoo-hover text-white px-4 py-2 rounded text-[13px] font-medium">
              Create
            </button>
            <textarea
              name="description"
              rows={2}
              placeholder="Description..."
              className="lg:col-span-5 px-3 py-2 border border-gray-300 rounded text-[13px] resize-none focus:outline-none focus:border-odoo"
            />
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {STAGES.map((column) => {
            const columnTasks = tasks.filter((task) => task.stage === column.key);
            return (
              <section
                key={column.key}
                className={`rounded border ${column.tone} min-h-[360px]`}
              >
                <div className="px-3 py-2 border-b border-black/10 flex items-center justify-between">
                  <div className="text-[13px] font-semibold text-gray-800">
                    {column.label}
                  </div>
                  <div className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                    {counts.get(column.key) ?? 0}
                  </div>
                </div>
                <div className="p-2 space-y-2">
                  {columnTasks.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded bg-white/70 p-6 text-center text-[12px] text-gray-400">
                      No tasks
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} users={users} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </>
    </OdooListPage>
  );
}

function TaskCard({
  task,
  users,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    stage: Stage;
    priority: number;
    dueDate: Date | null;
    assignedTo: { id: string; name: string } | null;
    createdBy: { name: string };
  };
  users: { id: string; name: string }[];
}) {
  const overdue =
    task.stage !== "DONE" && task.dueDate && task.dueDate < new Date();
  const move = moveTodoTask.bind(null, task.id);
  const update = updateTodoTask.bind(null, task.id);
  const remove = deleteTodoTask.bind(null, task.id);

  return (
    <article className="bg-white border border-gray-200 rounded shadow-sm">
      <form action={update} className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <input
            name="title"
            defaultValue={task.title}
            className="flex-1 border-0 border-b border-transparent px-0 py-0.5 text-[14px] font-medium text-gray-900 focus:outline-none focus:border-odoo"
          />
          <span
            className={`shrink-0 border rounded-full px-2 py-0.5 text-[10px] ${priorityClass(task.priority)}`}
          >
            {priorityLabel(task.priority)}
          </span>
        </div>
        <textarea
          name="description"
          defaultValue={task.description ?? ""}
          rows={2}
          placeholder="Description..."
          className="w-full resize-none rounded border border-gray-200 px-2 py-1 text-[12px] text-gray-600 focus:outline-none focus:border-odoo"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            name="assignedToId"
            defaultValue={task.assignedTo?.id ?? ""}
            className="px-2 py-1 border border-gray-200 rounded text-[12px] bg-white"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue={task.priority}
            className="px-2 py-1 border border-gray-200 rounded text-[12px] bg-white"
          >
            <option value="0">Normal</option>
            <option value="1">High</option>
            <option value="2">Urgent</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <input
            name="dueDate"
            type="date"
            defaultValue={task.dueDate?.toISOString().slice(0, 10) ?? ""}
            className={`px-2 py-1 border rounded text-[12px] ${
              overdue
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200"
            }`}
          />
          <button className="px-2 py-1 text-[12px] rounded border border-gray-200 text-gray-700 hover:bg-gray-50">
            Save
          </button>
        </div>
        <div className="text-[11px] text-gray-500">
          {task.dueDate
            ? `${overdue ? "Overdue: " : "Due: "}${DATE_FMT.format(task.dueDate)}`
            : "No due date"}{" "}
          · by {task.createdBy.name}
        </div>
      </form>

      <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap gap-1">
        {task.stage !== "TODO" && (
          <form action={move}>
            <input type="hidden" name="stage" value="TODO" />
            <button className="px-2 py-1 text-[11px] rounded hover:bg-gray-100 text-gray-600">
              Todo
            </button>
          </form>
        )}
        {task.stage !== "IN_PROGRESS" && (
          <form action={move}>
            <input type="hidden" name="stage" value="IN_PROGRESS" />
            <button className="px-2 py-1 text-[11px] rounded hover:bg-odoo/10 text-odoo">
              Start
            </button>
          </form>
        )}
        {task.stage !== "DONE" && (
          <form action={move}>
            <input type="hidden" name="stage" value="DONE" />
            <button className="px-2 py-1 text-[11px] rounded hover:bg-emerald-50 text-emerald-700">
              Done
            </button>
          </form>
        )}
        <form action={remove} className="ml-auto">
          <button className="px-2 py-1 text-[11px] rounded hover:bg-red-50 text-red-600">
            Delete
          </button>
        </form>
      </div>
    </article>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-2.5 py-1 rounded border ${
        active
          ? "bg-odoo text-white border-odoo"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
