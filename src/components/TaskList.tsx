"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Task } from "@/lib/types";
import { formatDate, formatTime, isOverdue } from "@/lib/utils";
import { useTaskStore } from "@/store/useTaskStore";
import { Draggable } from "@fullcalendar/interaction";

const DURATIONS = [30, 45, 60, 90, 120];
type LeftMode = "editor" | "list";

// "YYYY-MM-DD" を ISO(Z固定) にする（ズレ防止）
function dateOnlyToIsoZ(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00Z`).toISOString();
}

// ISO -> YYYY-MM-DD（input date用）
function isoToDateOnly(iso?: string) {
  if (!iso) return "";
  // Z固定で入ってても日付inputはYYYY-MM-DDだけ欲しい
  return iso.slice(0, 10);
}

/** ✅ 一覧用：セクション（静的コンポーネントとして外出し） */
function TaskAllListSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-2 text-xs font-semibold text-zinc-200">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** ✅ 一覧用：行（静的コンポーネントとして外出し） */
function TaskAllListRow({
  task,
  selected,
  onEdit,
}: {
  task: Task;
  selected: boolean;
  onEdit: (taskId: string) => void;
}) {
  const { toggleDone, deleteTask } = useTaskStore();

  return (
    <div
      className={[
        "rounded-xl border bg-zinc-900 p-3",
        selected ? "border-zinc-200" : "border-zinc-800",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-zinc-100 truncate">{task.title}</div>

          <div className="mt-1 text-xs text-zinc-400 flex flex-wrap gap-2">
            <span>⏱ {task.durationMin}分</span>
            {task.dueAt ? <span>📅 期限 {formatDate(task.dueAt)}</span> : null}

            {task.scheduledStart ? (
              <span>
                🗓 {formatDate(task.scheduledStart)} {formatTime(task.scheduledStart)}
              </span>
            ) : (
              <span>🗓 未予定</span>
            )}

            {task.location?.label ? <span>📍 {task.location.label}</span> : null}
            {task.memo?.trim() ? (
  <span
    className="opacity-80 truncate max-w-[320px]"
    title={task.memo}
  >
    📝 {task.memo}
  </span>
) : null}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(task.id)}
            className="rounded-xl bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
            title="編集画面へ"
          >
            編集
          </button>

          <button
            onClick={() => toggleDone(task.id)}
            className="rounded-xl bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
          >
            {task.status === "done" ? "戻す" : "完了"}
          </button>

          <button
            onClick={() => {
              const ok = window.confirm("このタスクを削除しますか？（取り消し不可）");
              if (ok) deleteTask(task.id);
            }}
            className="rounded-xl bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskList() {
  const {
    tasks,
    selectedTaskId,
    selectTask,
    addTask,
    updateTask,
    pickedLocation,
    setPickedLocation,
  } = useTaskStore();

  const [leftMode, setLeftMode] = useState<LeftMode>("editor");

  // ✅ selectedTaskId がある間は必ず編集画面を見せる（setStateしないのでeslint OK）
  const effectiveMode: LeftMode = selectedTaskId ? "editor" : leftMode;

  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const unplanned = useMemo(
    () => tasks.filter((t) => !t.scheduledStart),
    [tasks]
  );

  const doneCount = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((doneCount / tasks.length) * 100);
  }, [tasks.length, doneCount]);

  // FullCalendar 外部ドラッグ（Draggable + droppable:true）
  useEffect(() => {
    if (!containerRef.current) return;

    const draggable = new Draggable(containerRef.current, {
      itemSelector: ".external-task",
      eventData: (el) => {
        const taskId = el.getAttribute("data-task-id") || "";
        const task = tasks.find((t) => t.id === taskId);

        return {
          title: task?.title || "Task",
          duration: { minutes: task?.durationMin ?? 60 },
          extendedProps: { taskId },
        };
      },
    });

    return () => draggable.destroy();
  }, [tasks]);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ✅ 追加/編集 ⇄ 一覧 切替カード */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">
            {effectiveMode === "editor"
              ? selectedTask
                ? "TODO（編集中）"
                : "TODO（追加）"
              : "TODO（一覧）"}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-zinc-400">
              達成率{" "}
              <span className="font-semibold text-zinc-200">{progress}%</span>
            </div>

            {/* 切替ボタン */}
            <div className="flex overflow-hidden rounded-xl border border-zinc-800">
              <button
                onClick={() => setLeftMode("editor")}
                className={[
                  "px-3 py-1 text-xs",
                  effectiveMode === "editor"
                    ? "bg-zinc-200 text-zinc-950 font-semibold"
                    : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                ].join(" ")}
              >
                追加/編集
              </button>

              <button
                onClick={() => {
                  // ✅ 一覧に行くときは選択解除して、強制editorを解除する
                  selectTask(null);
                  setLeftMode("list");
                }}
                className={[
                  "px-3 py-1 text-xs",
                  effectiveMode === "list"
                    ? "bg-zinc-200 text-zinc-950 font-semibold"
                    : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                ].join(" ")}
              >
                一覧
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3">
          {effectiveMode === "editor" ? (
            <TaskEditorBody
              key={selectedTaskId ?? "new"} // ← 選択切替でフォーム状態をリセット
              selectedTask={selectedTask}
              pickedLocationLabel={pickedLocation?.label ?? ""}
              onClearPickedLocation={() => setPickedLocation(null)}
              onCancelEdit={() => selectTask(null)}
              onSubmitNew={(input) => {
                addTask({
                  ...input,
                  location: pickedLocation ?? undefined,
                });
              }}
              onSubmitEdit={(taskId, patch) => {
                updateTask(taskId, patch);
              }}
            />
          ) : (
            <TaskAllList
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onEdit={(id) => {
                selectTask(id);
                setLeftMode("editor");
              }}
            />
          )}
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          未予定のタスクは{" "}
          <span className="text-zinc-300 font-semibold">
            ドラッグしてカレンダーへ
          </span>
        </div>
      </div>

      {/* ✅ 未スケジュール一覧（ドラッグ用） */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-200">
            未スケジュール ({unplanned.length})
          </div>
          <div className="text-xs text-zinc-500">全体 {tasks.length}</div>
        </div>

        <div className="flex flex-col gap-2">
          {unplanned.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}

          {unplanned.length === 0 && (
            <div className="text-xs text-zinc-500 p-3">
              未スケジュールのタスクがありません 🎉
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
        <div className="font-semibold text-zinc-200 mb-1">操作メモ</div>
        <ul className="list-disc pl-4 space-y-1">
          <li>TODO/カレンダーのタスクをクリック → 編集対象になります</li>
          <li>地図クリック → 選択中タスクに場所が紐づきます</li>
          <li>未予定タスクはドラッグして予定化できます</li>
          <li>
            カレンダー上：<span className="text-zinc-200">Ctrl(⌘)</span>
            +クリックで完了切替 /{" "}
            <span className="text-zinc-200">Alt</span>+クリックで削除
          </li>
        </ul>
      </div>
    </div>
  );
}

/** ✅ 追加/編集フォーム（中身だけ） */
function TaskEditorBody(props: {
  selectedTask: Task | null;

  pickedLocationLabel: string;
  onClearPickedLocation: () => void;

  onCancelEdit: () => void;

  onSubmitNew: (input: {
    title: string;
    dueAt?: string;
    durationMin: number;
    memo?: string;
  }) => void;

  onSubmitEdit: (
    taskId: string,
    patch: Partial<Pick<Task, "title" | "dueAt" | "durationMin" | "memo">>
  ) => void;
}) {
  const { selectedTask } = props;

  const isEdit = Boolean(selectedTask);

  const [title, setTitle] = useState(selectedTask?.title ?? "");
  const [dueAt, setDueAt] = useState<string>(isoToDateOnly(selectedTask?.dueAt));
  const [durationMin, setDurationMin] = useState<number>(
    selectedTask?.durationMin ?? 60
  );
  const [memo, setMemo] = useState<string>(selectedTask?.memo ?? "");

  const submit = () => {
    if (!title.trim()) return;

    if (isEdit && selectedTask) {
      props.onSubmitEdit(selectedTask.id, {
        title: title.trim(),
        dueAt: dueAt ? dateOnlyToIsoZ(dueAt) : undefined,
        durationMin,
        memo: memo.trim() ? memo.trim() : undefined,
      });
      return;
    }

    props.onSubmitNew({
      title: title.trim(),
      dueAt: dueAt ? dateOnlyToIsoZ(dueAt) : undefined,
      durationMin,
      memo: memo.trim() ? memo.trim() : undefined,
    });

    // newモードだけクリア
    setTitle("");
    setDueAt("");
    setDurationMin(60);
    setMemo("");
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
        placeholder="タスク名（例：SPI 30分）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="flex gap-2">
        <input
          type="date"
          className="w-1/2 rounded-xl bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          title="期限（任意）"
        />
        <select
          className="w-1/2 rounded-xl bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          title="所要時間"
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d}分
            </option>
          ))}
        </select>
      </div>

      {/* ✅ 場所入力欄（Mapと連携 / 新規用） */}
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          placeholder={
            isEdit
              ? "場所は地図クリックで変更（選択中タスクに反映）"
              : "場所（地図クリックで自動入力）"
          }
          value={
            isEdit ? "（編集は地図クリックで反映）" : props.pickedLocationLabel
          }
          readOnly
        />
        <button
          onClick={props.onClearPickedLocation}
          className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          title="場所をクリア"
          disabled={isEdit}
        >
          クリア
        </button>
      </div>

      {/* ✅ メモ */}
      <textarea
        className="w-full resize-none rounded-xl bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
        placeholder="メモ（任意）例：帰りにコンビニ寄る"
        rows={3}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={submit}
          className="flex-1 rounded-xl bg-zinc-200 py-2 text-sm font-semibold text-zinc-950 hover:bg-white"
        >
          {isEdit ? "更新" : "追加"}
        </button>

        {isEdit && (
          <button
            onClick={props.onCancelEdit}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            編集解除
          </button>
        )}
      </div>
    </div>
  );
}

/** ✅ 全タスク一覧（予定あり/未予定/完了） */
function TaskAllList(props: {
  tasks: Task[];
  selectedTaskId: string | null;
  onEdit: (taskId: string) => void;
}) {
  const planned = useMemo(
  () =>
    props.tasks
      // ✅ 予定あり ＝ scheduledStart がある AND 未完了
      .filter((t) => t.scheduledStart && t.status !== "done")
      .slice()
      .sort(
        (a, b) =>
          new Date(a.scheduledStart as string).getTime() -
          new Date(b.scheduledStart as string).getTime()
      ),
  [props.tasks]
);

const unplanned = useMemo(
  () =>
    props.tasks
      // ✅ 未予定 ＝ scheduledStart がない AND 未完了
      .filter((t) => !t.scheduledStart && t.status !== "done"),
  [props.tasks]
);

const done = useMemo(
  () =>
    props.tasks
      // ✅ 完了 ＝ status が done（予定あり/未予定どっち由来でもここに集約）
      .filter((t) => t.status === "done"),
  [props.tasks]
);

  return (
    <div>
      <TaskAllListSection title={`予定あり（${planned.length}）`}>
        {planned.length ? (
          planned.map((t) => (
            <TaskAllListRow
              key={t.id}
              task={t}
              selected={props.selectedTaskId === t.id}
              onEdit={props.onEdit}
            />
          ))
        ) : (
          <div className="text-xs text-zinc-500">
            予定化されたタスクはありません
          </div>
        )}
      </TaskAllListSection>

      <TaskAllListSection title={`未予定（${unplanned.length}）`}>
        {unplanned.length ? (
          unplanned.map((t) => (
            <TaskAllListRow
              key={t.id}
              task={t}
              selected={props.selectedTaskId === t.id}
              onEdit={props.onEdit}
            />
          ))
        ) : (
          <div className="text-xs text-zinc-500">未予定タスクはありません</div>
        )}
      </TaskAllListSection>

      <TaskAllListSection title={`完了（${done.length}）`}>
        {done.length ? (
          done.map((t) => (
            <TaskAllListRow
              key={t.id}
              task={t}
              selected={props.selectedTaskId === t.id}
              onEdit={props.onEdit}
            />
          ))
        ) : (
          <div className="text-xs text-zinc-500">完了タスクはありません</div>
        )}
      </TaskAllListSection>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { selectedTaskId, selectTask, toggleDone, deleteTask } = useTaskStore();
  const selected = selectedTaskId === task.id;

  const overdue = isOverdue(task.dueAt, task.status === "done");

  return (
    <div
      className={[
        "external-task cursor-grab active:cursor-grabbing select-none rounded-2xl border bg-zinc-900 p-3 transition",
        selected ? "border-zinc-200" : "border-zinc-800 hover:border-zinc-700",
        overdue ? "ring-1 ring-red-500/60" : "",
        task.status === "done" ? "opacity-60" : "",
      ].join(" ")}
      data-task-id={task.id}
      onClick={() => selectTask(task.id)}
      title="ドラッグして予定化"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-zinc-100 truncate">{task.title}</div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
            <span>⏱ {task.durationMin}分</span>
            {task.dueAt && <span>📅 期限 {formatDate(task.dueAt)}</span>}
            {task.location?.label && <span>📍 {task.location.label}</span>}
            {task.memo?.trim() ? (
  <span
    className="opacity-80 truncate max-w-[320px]"
    title={task.memo}
  >
    📝 {task.memo}
  </span>
) : null}
            {selected && (
              <span className="text-zinc-200 font-semibold">← 編集対象</span>
            )}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleDone(task.id);
            }}
            className="rounded-xl bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
          >
            {task.status === "done" ? "戻す" : "完了"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id);
            }}
            className="rounded-xl bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}