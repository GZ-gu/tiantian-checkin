export const TARGET_OPTIONS = [7, 14, 21, 30];
export const MAX_ACTIVE_TASKS = 10;
export const MILESTONES = [
  { days: 7, key: "rookie", name: "打卡萌新" },
  { days: 14, key: "skilled", name: "打卡能手" },
  { days: 21, key: "expert", name: "打卡达人" },
  { days: 30, key: "master", name: "打卡王者" }
];

export class RuleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RuleError";
    this.code = code;
  }
}

export function createEmptyState() {
  return {
    version: 2,
    profile: {
      nickname: "小天天",
      avatar: "profile-avatar",
      gender: "保密",
      age: null
    },
    tasks: [],
    checkIns: []
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function localDateISO(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function saveProfile(state, input) {
  const nickname = String(input.nickname || "").trim();
  if (!nickname) throw new RuleError("PROFILE_NICKNAME_REQUIRED", "请填写昵称");
  if ([...nickname].length > 5) throw new RuleError("PROFILE_NICKNAME_TOO_LONG", "昵称最多填写5个字符");

  const next = cloneState(state);
  next.profile = {
    nickname,
    avatar: input.avatar || "lion-face",
    gender: input.gender || "保密",
    age: input.age ? Number(input.age) : null
  };
  return next;
}

function validateTaskInput(input) {
  const title = String(input.title || "").trim();
  const rewardText = String(input.rewardText || "").trim();
  const targetDays = Number(input.targetDays);
  if (!title) throw new RuleError("TASK_TITLE_REQUIRED", "请填写任务名称");
  if ([...title].length > 20) throw new RuleError("TASK_TITLE_TOO_LONG", "任务名称最多填写20个字符");
  if ([...rewardText].length > 20) throw new RuleError("TASK_REWARD_TOO_LONG", "奖励最多填写20个字符");
  if (!TARGET_OPTIONS.includes(targetDays)) throw new RuleError("TASK_TARGET_INVALID", "请选择7、14、21或30天");
  return { title, rewardText, targetDays };
}

export function activeTaskCount(state) {
  return state.tasks.filter((task) => !["archived", "deleted"].includes(task.status)).length;
}

export function createTask(state, input, now = new Date().toISOString()) {
  if (activeTaskCount(state) >= MAX_ACTIVE_TASKS) {
    throw new RuleError("TASK_LIMIT_REACHED", "最多同时进行10个任务");
  }
  const values = validateTaskInput(input);
  const next = cloneState(state);
  next.tasks.push({
    id: input.id || `task_${Date.parse(now)}_${next.tasks.length + 1}`,
    ...values,
    status: "active",
    createdAt: now,
    completedAt: null,
    rewardStatus: values.rewardText ? "pending" : "none",
    rewardRedeemedAt: null,
    archivedAt: null,
    deletedAt: null,
    unlockedMilestones: []
  });
  return next;
}

export function editTask(state, taskId, input) {
  const values = validateTaskInput(input);
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) throw new RuleError("TASK_NOT_FOUND", "没有找到这个任务");
  if (task.status !== "active") throw new RuleError("TASK_READ_ONLY", "这个任务当前不能编辑");
  if (countTaskCheckIns(next, taskId) > values.targetDays) {
    throw new RuleError("TASK_TARGET_BELOW_PROGRESS", "目标天数不能小于已完成天数");
  }
  Object.assign(task, values);
  task.rewardStatus = values.rewardText ? "pending" : "none";
  return next;
}

export function deleteTask(state, taskId, now = new Date().toISOString()) {
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) throw new RuleError("TASK_NOT_FOUND", "没有找到这个任务");
  if (task.status === "archived") throw new RuleError("TASK_READ_ONLY", "已归档任务不能删除");
  task.status = "deleted";
  task.deletedAt = now;
  return next;
}

export function getTask(state, taskId) {
  return state.tasks.find((task) => task.id === taskId) || null;
}

export function countTaskCheckIns(state, taskId) {
  return state.checkIns.filter((item) => item.taskId === taskId && item.status === "active").length;
}

export function getActiveCheckIn(state, taskId, date) {
  return state.checkIns.find((item) => item.taskId === taskId && item.date === date && item.status === "active") || null;
}

export function getTasksForDate(state, date) {
  return state.tasks.filter((task) => {
    const createdDate = localDateISO(task.createdAt);
    const archivedDate = task.archivedAt ? localDateISO(task.archivedAt) : null;
    const deletedDate = task.deletedAt ? localDateISO(task.deletedAt) : null;
    return createdDate <= date
      && (!archivedDate || date < archivedDate)
      && (!deletedDate || date < deletedDate);
  });
}

export function getDateTaskStatus(state, taskId, date, today = localDateISO()) {
  if (!getTasksForDate(state, date).some((task) => task.id === taskId)) return "unavailable";
  if (getActiveCheckIn(state, taskId, date)) return "checked";
  if (date > today) return "future";
  if (date === today) return "today";
  return "missed";
}

function validateReason(reason) {
  const value = String(reason || "").trim();
  if (!value) throw new RuleError("REASON_REQUIRED", "请填写原因");
  if ([...value].length > 100) throw new RuleError("REASON_TOO_LONG", "原因最多填写100个字符");
  return value;
}

export function checkIn(state, input, now = new Date().toISOString()) {
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === input.taskId);
  if (!task) throw new RuleError("TASK_NOT_FOUND", "没有找到这个任务");
  if (task.status !== "active") throw new RuleError("TASK_READ_ONLY", "这个任务当前不能继续打卡");

  const today = localDateISO(now);
  const date = input.date || today;
  const type = input.type || "normal";
  let reason = "";
  if (type === "normal" && date !== today) throw new RuleError("NORMAL_DATE_INVALID", "直接打卡只能记录今天");
  if (type === "makeup") {
    if (date >= today) throw new RuleError("MAKEUP_DATE_INVALID", "只能补过去漏掉的日期");
    reason = validateReason(input.reason);
  }
  if (getActiveCheckIn(next, task.id, date)) throw new RuleError("DUPLICATE_CHECKIN", "这一天已经完成啦");
  if (countTaskCheckIns(next, task.id) >= task.targetDays) throw new RuleError("TASK_ALREADY_COMPLETE", "任务已经完成啦");

  next.checkIns.push({
    id: input.id || `checkin_${Date.parse(now)}_${next.checkIns.length + 1}`,
    taskId: task.id,
    date,
    createdAt: now,
    type,
    status: "active",
    reason,
    revokedAt: null,
    revokeReason: ""
  });

  const completedDays = countTaskCheckIns(next, task.id);
  for (const milestone of MILESTONES) {
    if (milestone.days <= task.targetDays && completedDays >= milestone.days && !task.unlockedMilestones.includes(milestone.days)) {
      task.unlockedMilestones.push(milestone.days);
    }
  }
  if (completedDays >= task.targetDays) {
    task.status = "completed";
    task.completedAt = now;
  }
  return next;
}

export function revokeCheckIn(state, checkInId, reason, now = new Date().toISOString()) {
  const revokeReason = validateReason(reason);
  const next = cloneState(state);
  const checkIn = next.checkIns.find((item) => item.id === checkInId);
  if (!checkIn || checkIn.status !== "active") throw new RuleError("CHECKIN_NOT_FOUND", "这条打卡记录已失效");
  const task = next.tasks.find((item) => item.id === checkIn.taskId);
  if (!task) throw new RuleError("TASK_NOT_FOUND", "没有找到这个任务");
  if (task.status === "archived") throw new RuleError("TASK_READ_ONLY", "已归档任务不能撤销打卡");

  checkIn.status = "revoked";
  checkIn.revokedAt = now;
  checkIn.revokeReason = revokeReason;
  const completedDays = countTaskCheckIns(next, task.id);
  task.unlockedMilestones = (task.unlockedMilestones || []).filter((days) => days <= completedDays);
  if (completedDays < task.targetDays) {
    task.status = "active";
    task.completedAt = null;
  }
  return next;
}

export function redeemReward(state, taskId, now = new Date().toISOString()) {
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) throw new RuleError("TASK_NOT_FOUND", "没有找到这个任务");
  if (task.status !== "completed") throw new RuleError("TASK_NOT_COMPLETE", "完成目标后才能确认奖励");
  task.rewardStatus = "redeemed";
  task.rewardRedeemedAt = now;
  task.archivedAt = now;
  task.status = "archived";
  return next;
}

export function getMilestonesForTask(task) {
  return MILESTONES.filter((milestone) => milestone.days <= task.targetDays);
}

export function getCurrentMilestone(state, task) {
  const completedDays = countTaskCheckIns(state, task.id);
  const milestones = getMilestonesForTask(task);
  const target = milestones.find((milestone) => completedDays < milestone.days) || milestones[milestones.length - 1];
  const previousDays = milestones.filter((item) => item.days < target.days).at(-1)?.days || 0;
  const segmentDone = Math.max(0, Math.min(completedDays - previousDays, target.days - previousDays));
  return {
    ...target,
    completedDays,
    segmentDone,
    segmentTarget: target.days - previousDays,
    fill: Math.min(segmentDone / (target.days - previousDays), 1),
    achieved: completedDays >= target.days
  };
}

export function calculateGlobalStats(state) {
  const dates = [...new Set(state.checkIns.filter((item) => item.status === "active").map((item) => item.date))].sort();
  let streakDays = 0;
  if (dates.length) {
    let cursor = new Date(`${dates.at(-1)}T12:00:00`);
    for (let index = dates.length - 1; index >= 0; index -= 1) {
      if (dates[index] !== localDateISO(cursor)) break;
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }
  return {
    cumulativeDays: dates.length,
    cumulativeLabel: dates.length > 999 ? "999+" : String(dates.length),
    streakDays
  };
}

export function totalUnlockedBadges(state) {
  return state.tasks.reduce((total, task) => total + new Set(task.unlockedMilestones || []).size, 0);
}

export function getTaskTimeline(state, taskId, today = localDateISO()) {
  const task = getTask(state, taskId);
  if (!task) return [];
  const items = [{ id: `${task.id}_created`, type: "created", at: task.createdAt, task }];
  const createdDate = localDateISO(task.createdAt);
  const cursor = new Date(`${createdDate}T12:00:00`);
  const end = new Date(`${today}T12:00:00`);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor < end) {
    const date = localDateISO(cursor);
    const checkIns = state.checkIns.filter((item) => item.taskId === taskId && item.date === date);
    const makeup = checkIns.find((item) => item.type === "makeup" && item.status === "active");
    const active = checkIns.find((item) => item.status === "active");
    if (!active || makeup) {
      items.push({
        id: `${task.id}_missed_${date}`,
        type: "missed",
        at: `${date}T23:59:00`,
        date,
        madeUp: Boolean(makeup)
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const checkIn of state.checkIns.filter((item) => item.taskId === taskId)) {
    items.push({ id: checkIn.id, type: checkIn.type, at: checkIn.createdAt, checkIn });
    if (checkIn.revokedAt) items.push({ id: `${checkIn.id}_revoked`, type: "revoked", at: checkIn.revokedAt, checkIn });
  }
  if (task.rewardRedeemedAt) items.push({ id: `${task.id}_reward`, type: "reward", at: task.rewardRedeemedAt, task });
  if (task.archivedAt) items.push({ id: `${task.id}_archived`, type: "archived", at: task.archivedAt, task });
  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function seedDemoState(now = new Date()) {
  const today = localDateISO(now);
  const firstDate = new Date(`${today}T09:00:00`);
  firstDate.setDate(firstDate.getDate() - 3);
  let state = saveProfile(createEmptyState(), { nickname: "小天天", gender: "男孩", age: 12 });
  state = createTask(state, { id: "task_demo_words", title: "每天背诵英语单词10个", targetDays: 30, rewardText: "一顿大餐" }, firstDate.toISOString());
  state = createTask(state, { id: "task_demo_dance", title: "每天练舞30分钟", targetDays: 30, rewardText: "一双球鞋" }, new Date(firstDate.getTime() + 300000).toISOString());
  for (let offset = 3; offset >= 0; offset -= 1) {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - offset);
    const dateText = localDateISO(date);
    const createdAt = new Date(now);
    createdAt.setMinutes(createdAt.getMinutes() + (4 - offset));
    state = checkIn(state, { taskId: "task_demo_words", date: dateText, type: offset === 0 ? "normal" : "makeup", reason: offset === 0 ? "" : "演示数据" }, createdAt.toISOString());
  }
  return state;
}
