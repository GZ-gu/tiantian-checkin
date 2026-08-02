import assert from "node:assert/strict";
import test from "node:test";
import {
  RuleError,
  createEmptyState,
  saveProfile,
  createTask,
  checkIn,
  revokeCheckIn,
  redeemReward,
  countTaskCheckIns,
  getTasksForDate,
  getDateTaskStatus,
  isDateFullyChecked,
  calculateGlobalStats,
  totalUnlockedBadges,
  getTaskTimeline,
  seedDemoState
} from "../core.mjs";

const NOW = "2026-07-25T12:00:00+08:00";

test("a new device starts with the default profile and no activity", () => {
  const state = createEmptyState();
  assert.equal(state.profile.nickname, "小天天");
  assert.equal(state.tasks.length, 0);
  assert.equal(state.checkIns.length, 0);
  assert.equal(calculateGlobalStats(state).cumulativeDays, 0);
});

function baseState(targetDays = 7) {
  let state = saveProfile(createEmptyState(), { nickname: "小天天", gender: "男孩", age: 12 });
  return createTask(state, { id: "task_1", title: "每天背诵英语单词10个", targetDays, rewardText: "一顿大餐" }, NOW);
}

test("profile and task limits are enforced", () => {
  assert.throws(() => saveProfile(createEmptyState(), { nickname: "超过五个字昵称" }), (error) => error instanceof RuleError && error.code === "PROFILE_NICKNAME_TOO_LONG");
  assert.throws(() => createTask(saveProfile(createEmptyState(), { nickname: "小天" }), { title: "x".repeat(21), targetDays: 7 }), (error) => error.code === "TASK_TITLE_TOO_LONG");
});

test("direct check-in is unique per task and date", () => {
  let state = baseState();
  state = checkIn(state, { taskId: "task_1", type: "normal", date: "2026-07-25" }, NOW);
  assert.equal(countTaskCheckIns(state, "task_1"), 1);
  assert.throws(() => checkIn(state, { taskId: "task_1", type: "normal", date: "2026-07-25" }, NOW), (error) => error.code === "DUPLICATE_CHECKIN");
});

test("makeup only accepts past dates and a non-empty reason", () => {
  const state = baseState();
  assert.throws(() => checkIn(state, { taskId: "task_1", type: "makeup", date: "2026-07-25", reason: "忘记打卡" }, NOW), (error) => error.code === "MAKEUP_DATE_INVALID");
  assert.throws(() => checkIn(state, { taskId: "task_1", type: "makeup", date: "2026-07-24", reason: "   " }, NOW), (error) => error.code === "REASON_REQUIRED");
  const next = checkIn(state, { taskId: "task_1", type: "makeup", date: "2026-07-24", reason: "昨天已完成" }, NOW);
  assert.equal(next.checkIns[0].type, "makeup");
  assert.equal(next.checkIns[0].reason, "昨天已完成");
});

test("revoke rolls progress and current task status back", () => {
  let state = baseState();
  state = checkIn(state, { id: "check_1", taskId: "task_1", type: "normal", date: "2026-07-25" }, NOW);
  state = revokeCheckIn(state, "check_1", "孩子误碰", "2026-07-25T12:10:00+08:00");
  assert.equal(countTaskCheckIns(state, "task_1"), 0);
  assert.equal(state.checkIns[0].status, "revoked");
  assert.equal(state.checkIns[0].revokeReason, "孩子误碰");
});

test("milestone is not counted twice after revoke and reacquire", () => {
  let state = baseState();
  for (let day = 19; day <= 24; day += 1) {
    state = checkIn(state, { taskId: "task_1", type: "makeup", date: `2026-07-${day}`, reason: "补录" }, NOW);
  }
  state = checkIn(state, { id: "seventh", taskId: "task_1", type: "normal", date: "2026-07-25" }, NOW);
  assert.equal(totalUnlockedBadges(state), 1);
  state = revokeCheckIn(state, "seventh", "测试回退", "2026-07-25T12:20:00+08:00");
  assert.equal(totalUnlockedBadges(state), 0);
  state = checkIn(state, { taskId: "task_1", type: "normal", date: "2026-07-25" }, "2026-07-25T12:30:00+08:00");
  assert.equal(totalUnlockedBadges(state), 1);
});

test("reward redemption archives a completed task", () => {
  let state = baseState();
  for (let day = 19; day <= 24; day += 1) state = checkIn(state, { taskId: "task_1", type: "makeup", date: `2026-07-${day}`, reason: "补录" }, NOW);
  state = checkIn(state, { taskId: "task_1", type: "normal", date: "2026-07-25" }, NOW);
  assert.equal(state.tasks[0].status, "completed");
  state = redeemReward(state, "task_1", "2026-07-25T12:40:00+08:00");
  assert.equal(state.tasks[0].status, "archived");
  assert.equal(state.tasks[0].rewardStatus, "redeemed");
  assert.throws(() => revokeCheckIn(state, state.checkIns[0].id, "不能撤销"), (error) => error.code === "TASK_READ_ONLY");
});

test("global cumulative days deduplicate tasks and react to revoke", () => {
  let state = baseState();
  state = createTask(state, { id: "task_2", title: "每天练舞30分钟", targetDays: 7, rewardText: "看一场电影" }, NOW);
  state = checkIn(state, { id: "a", taskId: "task_1", type: "makeup", date: "2026-07-24", reason: "补录" }, NOW);
  state = checkIn(state, { id: "b", taskId: "task_2", type: "makeup", date: "2026-07-24", reason: "补录" }, NOW);
  assert.equal(calculateGlobalStats(state).cumulativeDays, 1);
  state = revokeCheckIn(state, "a", "撤销一条", NOW);
  assert.equal(calculateGlobalStats(state).cumulativeDays, 1);
  state = revokeCheckIn(state, "b", "撤销最后一条", NOW);
  assert.equal(calculateGlobalStats(state).cumulativeDays, 0);
});

test("a growth day is complete only when every task for that date is checked", () => {
  let state = baseState();
  state = createTask(state, { id: "task_2", title: "每天练舞30分钟", targetDays: 7, rewardText: "看一场电影" }, NOW);
  state.tasks.forEach((task) => { task.createdAt = "2026-07-23T09:00:00+08:00"; });
  state = checkIn(state, { id: "a", taskId: "task_1", type: "makeup", date: "2026-07-24", reason: "补录" }, NOW);
  assert.equal(isDateFullyChecked(state, "2026-07-24"), false);
  state = checkIn(state, { id: "b", taskId: "task_2", type: "makeup", date: "2026-07-24", reason: "补录" }, NOW);
  assert.equal(isDateFullyChecked(state, "2026-07-24"), true);
  state = revokeCheckIn(state, "a", "撤销第一项", NOW);
  assert.equal(isDateFullyChecked(state, "2026-07-24"), false);
});

test("date selection returns tasks and the correct interaction state", () => {
  let state = baseState();
  state.tasks[0].createdAt = "2026-07-23T09:00:00+08:00";
  state = checkIn(state, { taskId: "task_1", type: "makeup", date: "2026-07-24", reason: "昨天已完成" }, NOW);

  assert.deepEqual(getTasksForDate(state, "2026-07-23").map((task) => task.id), ["task_1"]);
  assert.equal(getDateTaskStatus(state, "task_1", "2026-07-23", "2026-07-25"), "missed");
  assert.equal(getDateTaskStatus(state, "task_1", "2026-07-24", "2026-07-25"), "checked");
  assert.equal(getDateTaskStatus(state, "task_1", "2026-07-25", "2026-07-25"), "today");
  assert.equal(getDateTaskStatus(state, "task_1", "2026-07-26", "2026-07-25"), "future");
});

test("timeline keeps missed-day rows and marks later makeup", () => {
  let state = baseState();
  state.tasks[0].createdAt = "2026-07-21T09:00:00+08:00";
  state = checkIn(state, { taskId: "task_1", type: "makeup", date: "2026-07-22", reason: "已完成但漏打卡" }, NOW);
  const missed = getTaskTimeline(state, "task_1", "2026-07-25").filter((item) => item.type === "missed");
  assert.deepEqual(missed.map((item) => [item.date, item.madeUp]), [
    ["2026-07-24", false],
    ["2026-07-23", false],
    ["2026-07-22", true]
  ]);
});

test("timeline retains the date of a revoked check-in", () => {
  let state = baseState();
  state = checkIn(state, { id: "check_1", taskId: "task_1", type: "makeup", date: "2026-07-24", reason: "补录" }, NOW);
  state = revokeCheckIn(state, "check_1", "日期录错", "2026-07-25T12:10:00+08:00");
  const revoked = getTaskTimeline(state, "task_1", "2026-07-25").find((item) => item.type === "revoked");
  assert.equal(revoked.checkIn.date, "2026-07-24");
  assert.equal(revoked.checkIn.revokeReason, "日期录错");
});

test("demo state is valid and immediately renderable", () => {
  const state = seedDemoState(new Date("2026-07-25T12:00:00+08:00"));
  assert.equal(state.profile.nickname, "小天天");
  assert.equal(state.tasks.length, 2);
  assert.equal(countTaskCheckIns(state, "task_demo_words"), 4);
  assert.deepEqual(getTasksForDate(state, "2026-07-22").map((task) => task.id), ["task_demo_words", "task_demo_dance"]);
});
