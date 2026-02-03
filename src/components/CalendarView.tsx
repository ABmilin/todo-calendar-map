"use client";

import { useEffect, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventReceiveArg } from "@fullcalendar/interaction";

import type {
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";

import { useTaskStore } from "@/store/useTaskStore";
import { addMinutes, formatDate, formatTime } from "@/lib/utils";
import type { Task } from "@/lib/types";

type ViewMode = "month" | "week" | "day";

type TaskEventExt = {
  taskId: string;
  dueAt?: string;
  locationLabel?: string;
  done?: boolean;
  memo?: string;
  kind?: "task" | "deadline-range" | "deadline-label";
};

type EventResizeLikeArg = {
  event: {
    id: string;
    start: Date | null;
    end: Date | null;
    extendedProps?: unknown;
  };
};

// ✅ ISO → ローカル日付の YYYY-MM-DD（ズレ対策）
function isoToDateOnlyLocal(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ✅ YYYY-MM-DD + days（DST対策に昼固定）
function addDaysLocal(dateOnly: string, days: number) {
  const d = new Date(`${dateOnly}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoToDateOnlyLocal(d.toISOString());
}

// "YYYY-MM-DD" -> ISO(Z固定)
function dateOnlyToIsoZ(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00Z`).toISOString();
}

function viewModeToFcView(mode: ViewMode) {
  if (mode === "month") return "dayGridMonth";
  if (mode === "week") return "timeGridWeek";
  return "timeGridDay";
}

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const {
    tasks,
    selectedTaskId,
    selectTask,
    viewMode,
    setViewMode,
    scheduleTask,
    toggleDone,
    deleteTask,
    rescheduleTask,
    setDueAt,
  } = useTaskStore();

  const mode = viewMode as ViewMode;

  const findTask = (taskId: string): Task | undefined =>
    tasks.find((t) => t.id === taskId);

  // ✅ viewMode変更 → FullCalendar側ビューも変更（1フレーム遅らせる）
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    const nextView = viewModeToFcView(mode);
    if (api.view.type === nextView) return;

    const raf = requestAnimationFrame(() => {
      api.changeView(nextView);
      // ついでにサイズも再計算（親の高さが変わるケースに強くする）
      api.updateSize();
    });

    return () => cancelAnimationFrame(raf);
  }, [mode]);

  // ✅ 初回/リサイズ時に updateSize（MonthRulesPanel の開閉などで潰れやすい対策）
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    const tick = () => requestAnimationFrame(() => api.updateSize());
    tick();

    window.addEventListener("resize", tick);
    return () => window.removeEventListener("resize", tick);
  }, []);

  // ✅ 通常イベント（予定化されたタスク）
  const taskEvents: EventInput[] = useMemo(() => {
    return tasks
      .filter((t) => t.scheduledStart)
      .map((t) => {
        const startIso = t.scheduledStart as string;
        const endIso = addMinutes(startIso, t.durationMin);

        return {
          id: t.id,
          title: t.title,
          start: startIso,
          end: endIso,
          classNames: [
            "task-event",
            t.status === "done" ? "task-done" : "task-todo",
          ],
          extendedProps: {
            taskId: t.id,
            dueAt: t.dueAt,
            locationLabel: t.location?.label ?? "",
            done: t.status === "done",
            memo: t.memo ?? "",
            kind: "task",
          } satisfies TaskEventExt,
        } satisfies EventInput;
      });
  }, [tasks]);

  // ✅ 月表示：期限までの “細いレンジバー” ＋ “→期限ラベル”
  const monthDeadlineEvents: EventInput[] = useMemo(() => {
    if (mode !== "month") return [];

    const list: EventInput[] = [];

    for (const t of tasks) {
      if (!t.scheduledStart || !t.dueAt) continue;
      if (t.status === "done") continue;

      const startDay = isoToDateOnlyLocal(String(t.scheduledStart));
      const dueDay = isoToDateOnlyLocal(String(t.dueAt));

      // ✅ “細いバー”でレンジ表示（endは排他的なので +1日）
      list.push({
        id: `dl-range-${t.id}`,
        title: "",
        start: startDay,
        end: addDaysLocal(dueDay, 1),
        allDay: true,
        display: "auto",
        editable: false,
        classNames: ["deadline-range-bar"],
        extendedProps: {
          taskId: t.id,
          kind: "deadline-range",
        } satisfies TaskEventExt,
      });

      // ✅ 期限当日の「→期限」ラベル（ドラッグで期限変更）
      list.push({
        id: `dl-label-${t.id}`,
        title: "→期限",
        start: dueDay,
        allDay: true,
        display: "auto",
        editable: true,
        classNames: ["deadline-label"],
        extendedProps: {
          taskId: t.id,
          kind: "deadline-label",
        } satisfies TaskEventExt,
      });
    }

    return list;
  }, [tasks, mode]);

  // ✅ クリック操作
  // - 通常クリック：選択（左フォームに反映）
  // - Ctrl(⌘)+クリック：完了/未完了
  // - Alt+クリック：削除
  const onEventClick = (arg: EventClickArg) => {
    const ext = arg.event.extendedProps as unknown as TaskEventExt;

    // deadline-range はクリック無視、deadline-label は期限編集用
    if (ext?.kind === "deadline-range") return;

    // ✅ 期限ラベルクリック → 選択だけ
    if (ext?.kind === "deadline-label") {
      selectTask(ext.taskId);
      return;
    }

    const taskId = ext?.taskId ?? arg.event.id;
    selectTask(taskId);

    const jsEv = arg.jsEvent;
    const isCtrl = jsEv.ctrlKey || jsEv.metaKey;
    const isAlt = jsEv.altKey;

    if (isCtrl) {
      toggleDone(taskId);
      return;
    }

    if (isAlt) {
      const ok = window.confirm(`このタスクを削除しますか？（取り消し不可）`);
      if (ok) {
        deleteTask(taskId);
        arg.event.remove();
      }
    }
  };

  // ✅ TODO → Calendar 外部ドラッグ
  const onReceive = (info: EventReceiveArg) => {
    const ext = info.event.extendedProps as unknown as TaskEventExt;
    const taskId = ext?.taskId;
    if (!taskId) return;

    const start = info.event.start;
    if (!start) return;

    scheduleTask(taskId, start.toISOString());
  };

  // ✅ ドラッグ移動
  const onDrop = (arg: EventDropArg) => {
    const ext = arg.event.extendedProps as unknown as TaskEventExt;

    // ✅ 月表示の「→期限」ラベルが動いたら dueAt 更新
    if (ext?.kind === "deadline-label") {
      const taskId = ext.taskId;
      const start = arg.event.start;
      if (!start) return;

      const day = isoToDateOnlyLocal(start.toISOString());
      setDueAt(taskId, dateOnlyToIsoZ(day));
      return;
    }

    // ✅ 通常タスクの移動
    const taskId = ext?.taskId ?? arg.event.id;

    const startIso = arg.event.start?.toISOString();
    if (!startIso) return;

    let endIso = arg.event.end?.toISOString();

    // month表示だと end が無いことがあるので補完
    if (!endIso) {
      const t = findTask(taskId);
      if (!t) return;
      endIso = addMinutes(startIso, t.durationMin);
    }

    rescheduleTask(taskId, startIso, endIso);
  };

  // ✅ 伸縮（時間変更）
  const onResize = (arg: EventResizeLikeArg) => {
    const taskId = arg.event.id;

    const startIso = arg.event.start?.toISOString();
    const endIso = arg.event.end?.toISOString();
    if (!startIso || !endIso) return;

    rescheduleTask(taskId, startIso, endIso);
  };

  // ✅ 表示を詰めすぎない（週表示は控えめに）
  const renderEventContent = (arg: EventContentArg) => {
    const ext = arg.event.extendedProps as unknown as TaskEventExt;

    // ✅ 月：期限レンジは “細いバー”なので中身表示なし
    if (ext?.kind === "deadline-range") return null;

    // ✅ 月：→期限だけ出す
    if (mode === "month" && ext?.kind === "deadline-label") {
      return <div className="px-1 text-[10px] leading-tight font-semibold">→期限</div>;
    }

    // ✅ 週・日：情報をコンパクトに
    const done = ext?.done;
    const dueAt = ext?.dueAt;
    const loc = ext?.locationLabel;
    const memo = ext?.memo;

    const isDayOrWeek =
      arg.view.type === "timeGridDay" || arg.view.type === "timeGridWeek";

    // 期限は「日付の数字」だけ表示
    const dueDayNum = dueAt
      ? String(new Date(dueAt).getUTCDate()).padStart(2, "0")
      : null;

    return (
      <div className="px-1 py-0.5 text-[11px] leading-tight">
        <div className="flex items-center gap-1 min-w-0">
          {isDayOrWeek && dueDayNum && (
            <span className="shrink-0 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] ring-1 ring-zinc-700">
              期:{dueDayNum}
            </span>
          )}
          <span className={done ? "line-through opacity-70 truncate" : "truncate"}>
            {arg.event.title}
          </span>
        </div>

        {isDayOrWeek && (
          <div className="mt-1 text-[10px] opacity-85 space-y-0.5">
            {loc ? <div className="truncate">📍 {loc}</div> : null}
            {memo ? <div className="opacity-80 truncate">📝 {memo}</div> : null}
            {arg.event.start ? (
              <div className="opacity-70">{formatTime(arg.event.start.toISOString())}</div>
            ) : null}
          </div>
        )}

        {arg.view.type === "timeGridDay" && dueAt ? (
          <div className="mt-1 text-[10px] opacity-70">期限日: {formatDate(dueAt)}</div>
        ) : null}
      </div>
    );
  };

  // ✅ 選択中タスクを目立たせる
  const eventClassNames = (info: { event: { id: string; extendedProps: unknown } }) => {
    const ext = info.event.extendedProps as unknown as TaskEventExt;
    const taskId = ext?.taskId ?? info.event.id;

    const classes: string[] = [];
    if (selectedTaskId && taskId === selectedTaskId) classes.push("task-selected");
    return classes;
  };

  return (
    <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 flex flex-col min-h-0">
      <div className="mb-2 flex items-center justify-between shrink-0">
        <div>
          <div className="text-lg font-semibold">Calendar</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            通常クリック=編集選択 / Ctrl(⌘)+クリック=完了切替 / Alt+クリック=削除
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("month")}
            className={[
              "rounded-xl px-3 py-1 text-sm",
              mode === "month"
                ? "bg-zinc-200 text-zinc-950 font-semibold"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
            ].join(" ")}
          >
            月
          </button>

          <button
            onClick={() => setViewMode("week")}
            className={[
              "rounded-xl px-3 py-1 text-sm",
              mode === "week"
                ? "bg-zinc-200 text-zinc-950 font-semibold"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
            ].join(" ")}
          >
            週
          </button>

          <button
            onClick={() => setViewMode("day")}
            className={[
              "rounded-xl px-3 py-1 text-sm",
              mode === "day"
                ? "bg-zinc-200 text-zinc-950 font-semibold"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
            ].join(" ")}
          >
            日
          </button>
        </div>
      </div>

      {/* ✅ ここが肝：残りの高さは flex-1 で確保（calc禁止） */}
      <div className="flex-1 min-h-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView={viewModeToFcView(mode)}
          headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
          height="100%"
          nowIndicator={true}
          editable={true}
          droppable={true}
          eventReceive={onReceive}
          eventDrop={onDrop}
          eventResize={onResize}
          eventClick={onEventClick}
          events={[...taskEvents, ...monthDeadlineEvents]}
          eventContent={renderEventContent}
          eventClassNames={eventClassNames}
          dayMaxEvents={true}
        />
      </div>
    </div>
  );
}