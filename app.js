import {
  RuleError,
  MILESTONES,
  TARGET_OPTIONS,
  createEmptyState,
  saveProfile,
  createTask,
  editTask,
  deleteTask,
  checkIn,
  revokeCheckIn,
  redeemReward,
  getTask,
  getActiveCheckIn,
  getTasksForDate,
  getDateTaskStatus,
  isDateFullyChecked,
  countTaskCheckIns,
  getCurrentMilestone,
  getMilestonesForTask,
  calculateGlobalStats,
  totalUnlockedBadges,
  getTaskTimeline,
  localDateISO,
  seedDemoState
} from "./core.mjs?v=1.2.19";

const STORAGE_KEY = "tiantian-checkin-v1.2-production";
const A = "./assets/figma";
const app = document.getElementById("app");
const modalRoot = document.getElementById("modalRoot");
const toastRoot = document.getElementById("toastRoot");

const MEDALS = Object.fromEntries(MILESTONES.map((item) => [item.key, {
  gray: `${A}/medal-${item.key}-gray.png`,
  color: `${A}/medal-${item.key}-color.png`
}]));

let state = loadInitialState();
let ui = createUiState();
let preparedPoster = null;
let posterPreparationToken = 0;

function loadInitialState() {
  if (location.hostname === "127.0.0.1") {
    const fixture = new URLSearchParams(location.search).get("test-fixture");
    if (fixture === "empty") return createEmptyState();
    if (fixture === "demo") return seedDemoState();
    if (fixture === "completed") return createCompletedFixture();
    if (fixture === "success") return createProgressFixture(3, 30);
    if (fixture === "milestone") return createProgressFixture(6, 30);
    if (fixture === "final") return createProgressFixture(6, 7);
  }
  return loadState();
}

function createProgressFixture(completedDays, targetDays) {
  const now = new Date();
  const today = localDateISO(now);
  const created = new Date(`${today}T09:00:00`);
  created.setDate(created.getDate() - completedDays);
  let fixture = createTask(createEmptyState(), { id: "task_progress", title: "每天背诵英语单词10个", targetDays, rewardText: "一顿大餐" }, created.toISOString());
  for (let offset = completedDays; offset >= 1; offset -= 1) {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - offset);
    fixture = checkIn(fixture, { taskId: "task_progress", date: localDateISO(date), type: "makeup", reason: "验收记录" }, now.toISOString());
  }
  return fixture;
}

function createCompletedFixture() {
  const now = new Date();
  const today = localDateISO(now);
  const created = new Date(`${today}T09:00:00`);
  created.setDate(created.getDate() - 6);
  let fixture = createTask(createEmptyState(), { id: "task_completed", title: "每天背诵英语单词10个", targetDays: 7, rewardText: "一顿大餐" }, created.toISOString());
  for (let offset = 6; offset >= 1; offset -= 1) {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - offset);
    fixture = checkIn(fixture, { taskId: "task_completed", date: localDateISO(date), type: "makeup", reason: "验收记录" }, now.toISOString());
  }
  return checkIn(fixture, { taskId: "task_completed", date: today, type: "normal" }, now.toISOString());
}

function createUiState() {
  return {
    view: "today",
    selectedDate: localDateISO(),
    selectedTaskId: null,
    editingTaskId: null,
    modal: null,
    success: null,
    growthExpanded: false,
    monthOffset: 0,
    returnView: "today"
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 2 && Array.isArray(saved.tasks) && Array.isArray(saved.checkIns)) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createEmptyState();
}

function persist(next) {
  state = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function formatDate(dateText, withYear = false) {
  const date = new Date(`${dateText}T12:00:00`);
  return `${withYear ? `${date.getFullYear()}年` : ""}${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return {
    date: `${date.getMonth() + 1}月${date.getDate()}日`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  };
}

function weekdayText(dateText = localDateISO()) {
  const date = new Date(`${dateText}T12:00:00`);
  return `星期${"日一二三四五六"[date.getDay()]}`;
}

function icon(src, alt = "", className = "") {
  return `<img class="${className}" src="${src}" alt="${alt}" />`;
}

function profileAvatarSrc() {
  return state.profile.avatar?.startsWith("data:image/")
    ? state.profile.avatar
    : `${A}/profile-avatar.png?v=1.2.19`;
}

function scrollAppTop() {
  document.querySelector(".app-viewport")?.scrollTo(0, 0);
}

function pageHeader(title, backView = "today", className = "") {
  return `<header class="page-header ${className}"><div class="page-toolbar"><button class="icon-button" type="button" data-view="${backView}" aria-label="返回">${icon(`${A}/back.svg`)}</button><h1>${title}</h1><span></span></div></header>`;
}

function showToast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  toastRoot.appendChild(item);
  setTimeout(() => item.remove(), 2300);
}

function medalMarkup(milestone, fill, className = "") {
  const asset = MEDALS[milestone.key];
  const empty = Math.max(0, 100 - Math.round(fill * 100));
  return `<div class="medal-fill ${className}" style="--empty:${empty}%">
    <img src="${asset.gray}" alt="" />
    <div class="medal-color-mask"><img src="${asset.color}" alt="${milestone.name}" /></div>
  </div>`;
}

function navMarkup(active) {
  const items = [
    ["today", "home", "天天打卡"],
    ["publish", "publish", "发布任务"],
    ["badges", "badge", "我的勋章"]
  ];
  return `<nav class="bottom-nav" aria-label="主导航">${items.map(([view, asset, label]) => {
    const selected = active === view;
    return `<button type="button" class="nav-button ${selected ? "active" : ""}" data-view="${view}">${icon(`${A}/nav-${asset}-${selected ? "active" : "inactive"}.svg`)}<span>${label}</span></button>`;
  }).join("")}</nav>`;
}

function render() {
  modalRoot.innerHTML = "";
  if (ui.success) {
    toastRoot.innerHTML = "";
    app.innerHTML = renderSuccess();
    return;
  }
  const views = {
    today: renderToday,
    publish: renderPublish,
    edit: renderEdit,
    badges: renderBadges,
    profile: renderProfile,
    records: renderRecords,
    reward: renderReward,
    share: renderShare
  };
  app.innerHTML = (views[ui.view] || renderToday)();
  if (ui.modal) renderModal();
  if (ui.view === "share") preparePoster();
}

function renderHomeHero() {
  const stats = calculateGlobalStats(state);
  return `<header class="home-hero" data-figma-node="189:2371">${icon(`${A}/home-wave.svg`, "", "hero-wave")}${icon(`${A}/spark-dot-lg.svg`, "", "spark spark-dot-lg")}${icon(`${A}/spark-dot-sm.svg`, "", "spark spark-dot-sm")}${icon(`${A}/spark-star-lg.svg`, "", "spark spark-star-lg")}${icon(`${A}/spark-star-sm.svg`, "", "spark spark-star-sm")}<div class="hero-art" data-figma-node="189:2377">${icon(`${A}/lion-home.png`, "小狮子")}</div><div class="hero-copy" data-figma-node="189:2378"><h1>你好，${escapeHtml(state.profile.nickname)}！</h1><div class="day-chip">进步第 <strong>${stats.cumulativeLabel}</strong> 天${icon(`${A}/bolt.svg`)}</div><p>每天进步一点点，攒成孩子看得到的小勋章。</p></div></header>`;
}

function getWeekDates(selectedDate = ui.selectedDate) {
  const anchor = new Date(`${selectedDate}T12:00:00`);
  anchor.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + index);
    return localDateISO(date);
  });
}

function growthDayState(iso, today) {
  if (isDateFullyChecked(state, iso)) return "done";
  if (iso === today) return "today";
  if (iso < today && getTasksForDate(state, iso).length) return "past";
  return "future";
}

function renderGrowthCard(emptyState = false) {
  const today = localDateISO();
  const days = getWeekDates().map((iso) => {
    const date = new Date(`${iso}T12:00:00`);
    const selected = iso === ui.selectedDate;
    const todayDate = iso === today;
    const completed = isDateFullyChecked(state, iso);
    const stateClass = growthDayState(iso, today);
    const symbol = completed ? icon(`${A}/check.svg`) : todayDate ? icon(`${A}/day-lion.svg`) : "";
    const weekday = `周${"日一二三四五六"[date.getDay()]}`;
    const day = String(date.getDate()).padStart(2, "0");
    return `<button type="button" class="day-node ${stateClass} ${selected ? "selected" : ""}" data-action="select-date" data-date="${iso}" aria-label="${formatDate(iso)}"><span>${weekday}</span><i>${symbol}</i><b>${day}</b></button>`;
  }).join("");
  const month = new Date(`${ui.selectedDate}T12:00:00`).getMonth() + 1;
  return `<section class="growth-card ${emptyState ? "empty-growth" : ""} ${ui.growthExpanded ? "expanded" : ""}" data-figma-node="${ui.growthExpanded ? "189:2796" : "189:2386"}"><div class="growth-header"><strong>${ui.growthExpanded ? `成长轨迹（${month}月）` : "本周成长轨迹"}</strong><button class="expand-button" type="button" data-action="toggle-growth"><span>${ui.growthExpanded ? "收起" : "展开"}</span>${icon(`${A}/down.svg`, "", ui.growthExpanded ? "rotated" : "")}</button></div>${ui.growthExpanded ? renderMonthCalendar() : `<div class="week-grid">${days}</div>`}</section>`;
}

function renderMonthCalendar() {
  const base = new Date(`${ui.selectedDate}T12:00:00`);
  base.setMonth(base.getMonth() + ui.monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const gridStart = new Date(year, month, 1, 12);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const rows = Math.ceil((new Date(year, month + 1, 0, 12).getDate() + new Date(year, month, 1, 12).getDay()) / 7);
  const today = localDateISO();
  const dates = Array.from({ length: rows * 7 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const iso = localDateISO(date);
    const done = isDateFullyChecked(state, iso);
    const stateClass = growthDayState(iso, today);
    const symbol = done ? icon(`${A}/check.svg`) : iso === today ? icon(`${A}/day-lion.svg`) : "";
    return `<button type="button" class="month-track-day ${stateClass} ${iso === ui.selectedDate ? "selected" : ""} ${date.getMonth() !== month ? "adjacent" : ""}" data-action="select-date" data-date="${iso}" aria-label="${formatDate(iso)}"><i>${symbol}</i><b>${String(date.getDate()).padStart(2, "0")}</b></button>`;
  }).join("");
  return `<div class="month-track ${rows === 6 ? "six-rows" : ""}"><div class="month-track-week"><span>周日</span><span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span></div><div class="month-track-grid">${dates}</div></div>`;
}

function renderToday() {
  const tasks = getTasksForDate(state, ui.selectedDate).filter((task) => ["active", "completed"].includes(task.status));
  const today = localDateISO();
  const title = ui.selectedDate === today ? "今日任务" : `${new Date(`${ui.selectedDate}T12:00:00`).getMonth() + 1}月${new Date(`${ui.selectedDate}T12:00:00`).getDate()}日任务`;
  const emptyState = tasks.length === 0;
  return `<section class="screen home-screen ${emptyState ? "is-empty" : "has-tasks"}" data-figma-node="189:2370">${renderHomeHero()}${renderGrowthCard(emptyState)}<div class="section-heading" data-figma-node="189:2388"><h2>${title} <small>（${tasks.length ? `${tasks.length}项` : "未发布"}）</small></h2><time>${formatDate(ui.selectedDate, true)} ${weekdayText(ui.selectedDate)}</time></div>${tasks.length ? `<div class="task-list">${tasks.map((task) => renderTaskCard(task, ui.selectedDate)).join("")}</div>` : renderEmptyTask()}${navMarkup("today")}</section>`;
}

function renderEmptyTask() {
  const isToday = ui.selectedDate === localDateISO();
  return `<article class="empty-task-card" data-figma-node="189:2606"><div class="empty-task-copy">${icon(`${A}/lion-empty.png`, "小狮子")}<div><strong>${isToday ? "发布一个新任务试试吧" : "这一天还没有任务"}</strong>${isToday ? `<div class="empty-task-meta"><span>${icon(`${A}/calendar.svg`)}未发布</span><span>${icon(`${A}/target.svg`)}目标0天</span><span>${icon(`${A}/gift.svg`)}未设置奖励</span></div>` : `<p>选择其他日期查看，或回到今天新建任务。</p>`}</div></div>${isToday ? `<button class="primary-button compact" type="button" data-view="publish" data-figma-node="189:2639">${icon(`${A}/add.svg`)}<span>新建任务</span></button>` : ""}</article>`;
}

function renderMeta(task) {
  const created = localDateISO(task.createdAt);
  return `<div class="task-meta"><span>${icon(`${A}/calendar.svg`)}${formatDate(created)}发布</span><span>${icon(`${A}/target.svg`)}目标${task.targetDays}天</span><span class="reward">${icon(`${A}/gift.svg`)}${escapeHtml(task.rewardText || "未设置奖励")}</span></div>`;
}

function renderTaskCard(task, date) {
  const progress = getCurrentMilestone(state, task);
  const status = getDateTaskStatus(state, task.id, date);
  const checked = status === "checked";
  const completed = task.status === "completed";
  const segments = Array.from({ length: progress.segmentTarget }, (_, index) => `<i class="${index < progress.segmentDone ? "done" : ""}"></i>`).join("");
  let action = "";
  if (completed) action = `<button class="checkin-button" type="button" data-action="reward" data-task-id="${task.id}">回应奖励</button>`;
  else if (status === "today") action = `<button class="checkin-button" type="button" data-action="checkin" data-task-id="${task.id}">${icon(`${A}/checkin-success.svg`)}<span>打卡</span></button>`;
  else if (status === "missed") action = `<button class="checkin-button makeup" type="button" data-action="makeup" data-task-id="${task.id}" data-date="${date}">${icon(`${A}/makeup.svg`)}<span>补卡</span></button>`;
  else if (checked) action = `<span class="completed-label">${icon(`${A}/success.svg`)}已完成打卡</span>`;
  else action = `<span class="future-label">尚未到打卡时间</span>`;
  const footer = checked && !completed
    ? `<span class="completed-indicator">${icon(`${A}/success.svg`)}<span>已完成打卡</span></span><button class="history-link history-link-right" type="button" data-action="records" data-task-id="${task.id}"><span>查看打卡记录</span>${icon(`${A}/chevron.svg`)}</button>`
    : `<button class="history-link" type="button" data-action="records" data-task-id="${task.id}"><span>查看打卡记录</span>${icon(`${A}/chevron.svg`)}</button>${action}`;
  return `<article class="task-card"><div class="task-top"><h3>${escapeHtml(task.title)}</h3>${checked ? `<span class="status-check">${icon(`${A}/check.svg`)}</span>` : ""}</div>${renderMeta(task)}<div class="task-progress">${medalMarkup(progress, progress.fill)}<div class="progress-copy"><strong>${progress.name}（${progress.segmentDone}/${progress.segmentTarget}）</strong><div class="segment-bar">${segments}</div></div><button class="share-link" type="button" data-action="share" data-task-id="${task.id}" aria-label="分享">${icon(`${A}/share.svg`)}<span>分享</span></button></div><div class="task-footer ${checked ? "completed" : ""}">${footer}</div></article>`;
}

function renderPublishHero(taskCount) {
  return `<header class="publish-hero">${icon(`${A}/home-wave.svg`, "", "hero-wave")}${icon(`${A}/spark-dot-lg.svg`, "", "spark spark-dot-lg")}${icon(`${A}/spark-dot-sm.svg`, "", "spark spark-dot-sm")}${icon(`${A}/spark-star-lg.svg`, "", "spark spark-star-lg")}${icon(`${A}/spark-star-sm.svg`, "", "spark spark-star-sm")}${icon(`${A}/lion-publish.png`, "小狮子", "publish-lion")}<div class="publish-copy"><h1>发布任务</h1><span>已发布 <strong>${taskCount}</strong> 个${icon(`${A}/bolt.svg`)}</span><p>每天进步一点点，攒成孩子看得到的小勋章。</p></div></header>`;
}

function taskFields(task = null) {
  const rewardControl = task
    ? `<textarea class="field-control reward-control" id="rewardText" name="rewardText" maxlength="20" placeholder="请输入内容">${escapeHtml(task.rewardText || "")}</textarea>`
    : `<input class="field-control" id="rewardText" name="rewardText" maxlength="20" value="" placeholder="请输入内容" />`;
  return `<div class="field"><label for="taskTitle">任务名称（必填）</label><input class="field-control" id="taskTitle" name="title" maxlength="20" value="${escapeHtml(task?.title || "")}" placeholder="请输入内容" /><div class="field-meta"><span data-error="title"></span><span data-count="taskTitle">${[...(task?.title || "")].length}/20</span></div></div><div class="field"><label for="targetDays">目标天数（必填）</label><select class="field-control" id="targetDays" name="targetDays">${TARGET_OPTIONS.map((days) => `<option value="${days}" ${task?.targetDays === days ? "selected" : ""}>${days}天</option>`).join("")}</select></div><div class="field"><label for="rewardText">完成目标奖励（非必填）</label>${rewardControl}<div class="field-meta"><span data-error="rewardText"></span><span data-count="rewardText">${[...(task?.rewardText || "")].length}/20</span></div></div>`;
}

function renderPublish() {
  const tasks = state.tasks.filter((task) => !["archived", "deleted"].includes(task.status));
  const taskList = tasks.length ? `<div class="section-heading manage-heading"><h2>任务列表</h2><time>${formatDate(localDateISO(), true)} ${weekdayText()}</time></div><div class="manage-list">${tasks.map(renderManageCard).join("")}</div>` : "";
  return `<section class="screen publish-screen">${renderPublishHero(tasks.length)}<form id="taskForm" class="form-card" novalidate>${taskFields()}<button class="primary-button compact" type="submit">${icon(`${A}/add.svg`)}<span>新建任务</span></button></form>${taskList}${navMarkup("publish")}</section>`;
}

function renderManageCard(task) {
  return `<article class="manage-card"><div class="manage-main"><div class="manage-title"><strong>${escapeHtml(task.title)}</strong><strong>${countTaskCheckIns(state, task.id)} / ${task.targetDays}</strong></div>${renderMeta(task)}</div><div class="manage-actions"><button type="button" data-action="edit-task" data-task-id="${task.id}" ${task.status !== "active" ? "disabled" : ""}>编辑任务</button><button type="button" data-action="records" data-task-id="${task.id}">打卡记录</button></div></article>`;
}

function renderEdit() {
  const task = getTask(state, ui.editingTaskId);
  if (!task) {
    ui.view = "publish";
    return renderPublish();
  }
  return `<section class="screen edit-screen">${pageHeader("编辑任务", "publish")}<form id="taskForm" class="form-card edit-form" novalidate>${taskFields(task)}<button class="primary-button" type="submit">确定修改</button><button class="danger-button" type="button" data-action="delete-task" data-task-id="${task.id}">删除任务</button></form></section>`;
}

function milestoneSummary(milestone) {
  const eligible = state.tasks.filter((task) => task.status !== "deleted" && task.targetDays >= milestone.days);
  const earned = eligible.filter((task) => countTaskCheckIns(state, task.id) >= milestone.days).length;
  const best = eligible.reduce((max, task) => Math.max(max, countTaskCheckIns(state, task.id)), 0);
  const previous = MILESTONES.filter((item) => item.days < milestone.days).at(-1)?.days || 0;
  const fill = Math.max(0, Math.min((best - previous) / (milestone.days - previous), 1));
  return { earned, fill };
}

function renderBadges() {
  const stats = calculateGlobalStats(state);
  return `<section class="screen badges-screen"><header class="badges-hero">${icon(`${A}/home-wave.svg`, "", "badges-wave")}<button class="profile-link" type="button" data-view="profile">${icon(profileAvatarSrc(), "头像")}<span><strong>${escapeHtml(state.profile.nickname)}</strong><small>${icon(`${A}/edit-name.svg`)}编辑信息</small></span></button>${icon(`${A}/lion-badges.png?v=1.2.19`, "小狮子", "badges-lion")}</header><div class="badge-stats"><div><span>坚持打卡</span><strong>${stats.cumulativeLabel}<small> 天</small></strong></div><div><span>完成任务</span><strong>${state.tasks.filter((task) => ["completed", "archived"].includes(task.status)).length}<small> 个</small></strong></div><div><span>获得勋章</span><strong>${totalUnlockedBadges(state)}<small> 枚</small></strong></div></div><h2 class="medal-wall-title">勋章墙</h2><div class="medal-list">${MILESTONES.map((milestone) => { const summary = milestoneSummary(milestone); return `<article class="medal-card">${medalMarkup(milestone, summary.fill)}<div><h3>${milestone.name}勋章</h3><p>累计获得 <strong>${summary.earned}</strong> 次</p></div></article>`; }).join("")}</div>${navMarkup("badges")}</section>`;
}

function renderProfile() {
  return `<section class="screen profile-screen">${pageHeader("个人信息", "badges")}<form id="profileForm" class="profile-card" novalidate><label class="profile-avatar"><img data-avatar-preview src="${profileAvatarSrc()}" alt="当前头像" /><span>点击切换头像</span><input id="avatarFile" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" /><input data-avatar-value type="hidden" name="avatar" value="${escapeHtml(state.profile.avatar || "profile-avatar")}" /></label><div class="field"><label for="nickname">打卡人昵称</label><input class="field-control" id="nickname" name="nickname" maxlength="5" value="${escapeHtml(state.profile.nickname)}" /><div class="field-meta"><span data-error="nickname"></span><span data-count="nickname">${[...state.profile.nickname].length}/5</span></div></div><input type="hidden" name="gender" value="${escapeHtml(state.profile.gender || "保密")}" /><input type="hidden" name="age" value="${state.profile.age || ""}" /><button class="primary-button" type="submit">保存信息</button></form></section>`;
}

function renderRecords() {
  const task = getTask(state, ui.selectedTaskId);
  if (!task) {
    ui.view = "today";
    return renderToday();
  }
  const timeline = getTaskTimeline(state, task.id);
  const readOnly = ["archived", "deleted"].includes(task.status);
  return `<section class="screen records-screen">${pageHeader("打卡记录", ui.returnView)}<main class="records-content"><h2>${escapeHtml(task.title)}</h2><div class="record-year">${new Date().getFullYear()}年</div><div class="timeline">${timeline.map((item) => renderTimelineItem(item, task, readOnly)).join("")}</div></main></section>`;
}

function renderTimelineItem(item, task, readOnly) {
  const time = formatDateTime(item.at);
  if (item.type === "created") return timelineMarkup(time, `创建任务：${escapeHtml(task.title)}<br>目标天数：${task.targetDays}天<br>完成奖励：${escapeHtml(task.rewardText || "未设置")}`);
  if (item.type === "reward") return timelineMarkup(time, `奖励已兑现：${escapeHtml(task.rewardText || "约定奖励")}`);
  if (item.type === "archived") return timelineMarkup(time, "任务已归档，历史记录已保留");
  if (item.type === "missed") {
    const action = item.madeUp
      ? `<span class="record-tag muted">已补卡</span>`
      : readOnly ? "" : `<button class="record-tag makeup" type="button" data-action="makeup" data-task-id="${task.id}" data-date="${item.date}">${icon(`${A}/makeup.svg`)}补卡</button>`;
    return timelineMarkup(time, "未打卡", action);
  }
  const check = item.checkIn;
  if (item.type === "revoked") return timelineMarkup(time, `已撤销${formatDate(check.date)}打卡（原因：${escapeHtml(check.revokeReason)}）`);
  const content = item.type === "makeup" ? `完成${formatDate(check.date)}补卡（原因：${escapeHtml(check.reason)}）` : "完成打卡";
  const action = !readOnly && check.status === "active" ? `<button class="record-tag" type="button" data-action="revoke" data-checkin-id="${check.id}">${icon(`${A}/revoke.svg`)}撤销</button>` : `<span class="record-tag muted">${check.status === "revoked" ? "已撤销" : "已归档"}</span>`;
  return timelineMarkup(time, content, action);
}

function timelineMarkup(time, content, action = "") {
  return `<div class="timeline-item"><time>${time.date}<br>${time.time}</time><i></i><div><span>${content}</span>${action}</div></div>`;
}

function renderSuccess() {
  const task = getTask(state, ui.success.taskId);
  if (!task) {
    ui.success = null;
    return renderToday();
  }
  const currentProgress = getCurrentMilestone(state, task);
  const milestone = ui.success.milestone || currentProgress;
  const isMilestone = Boolean(ui.success.milestone);
  const progress = isMilestone ? { ...milestone, segmentDone: milestone.days, segmentTarget: milestone.days, fill: 1 } : currentProgress;
  const count = countTaskCheckIns(state, task.id);
  const segments = Array.from({ length: progress.segmentTarget }, (_, index) => `<i class="${index < progress.segmentDone ? "done" : ""}"></i>`).join("");
  const staticConfetti = ["blue", "orange", "mint", "pink", "yellow", "star"].map((name) => icon(`${A}/confetti-${name}.svg`, "", `success-confetti confetti-${name}`)).join("");
  return `<section class="success-screen ${isMilestone ? "milestone-success" : "standard-success"}"><button class="success-close" type="button" data-action="close-success" aria-label="返回">${icon(`${A}/back.svg`)}</button><div class="success-heading">${icon(`${A}/lion-success.png?v=1.2.19`, "小狮子")}<div><h1>打卡成功!</h1><p>今天的努力已经记录下来了</p></div></div>${staticConfetti}${icon(`${A}/confetti.svg`, "", "confetti-animation success-confetti-animation")}<div class="celebration"><div class="success-medal-ring">${icon(`${A}/success-outer-ring.svg`, "", "success-outer-ring")}<div class="success-medal-core">${icon(`${A}/success-inner-ring.svg`, "", "success-inner-ring")}${medalMarkup(milestone, progress.fill, "success-medal")}</div></div></div><article class="success-progress"><h2>${milestone.name}</h2><p>勋章注入 <strong>${progress.segmentDone}</strong> 格 · 当前 ${progress.segmentDone}/${progress.segmentTarget}</p><div class="success-bar">${segments}</div><span>${isMilestone ? `恭喜你，成功获得${milestone.name}勋章！` : `再完成 ${Math.max(progress.segmentTarget - progress.segmentDone, 0)} 天即可点亮勋章`}</span></article><div class="success-stats"><div><span class="success-stat-icon green">${icon(`${A}/success-stat-streak.svg`)}</span><span>连续坚持</span><strong>${calculateGlobalStats(state).streakDays}<small> 天</small></strong></div><div><span class="success-stat-icon teal">${icon(`${A}/success-stat-week.svg`)}</span><span>本周完成</span><strong>${getWeekDates().filter((date) => state.checkIns.some((item) => item.status === "active" && item.date === date && item.taskId === task.id)).length}<small> 天</small></strong></div><div><span class="success-stat-icon yellow">${icon(`${A}/success-stat-target.svg`)}</span><span>距离目标</span><strong>${Math.max(task.targetDays - count, 0)}<small> 天</small></strong></div></div>${ui.success.final ? `<button class="primary-button success-next" type="button" data-action="open-reward" data-task-id="${task.id}">回应约定奖励</button>` : `<button class="primary-button success-next" type="button" data-action="share" data-task-id="${task.id}">${icon(`${A}/share-success.svg`)}<span>生成分享卡</span></button>`}<button class="plain-button success-return" type="button" data-action="close-success">返回今日任务</button></section>`;
}

function renderReward() {
  const task = getTask(state, ui.selectedTaskId);
  if (!task) {
    ui.view = "today";
    return renderToday();
  }
  const milestone = getMilestonesForTask(task).at(-1);
  return `<section class="reward-screen"><button class="reward-close" type="button" data-view="today" aria-label="关闭">${icon(`${A}/close.svg`)}</button><div class="reward-celebration">${icon(`${A}/confetti.svg`, "", "confetti-animation reward-confetti-animation")}${medalMarkup(milestone, 1, "reward-medal")}<span>${task.targetDays}天里程碑</span><h1>恭喜你打成目标！</h1><p>连续完成 ${task.targetDays} 天，每一次坚持都算数</p></div><main class="reward-body"><article class="reward-card"><div class="reward-heading"><span>${icon(`${A}/gift.svg`)}</span><div><small>家长约定奖励</small><strong>${escapeHtml(task.rewardText || "一次认真表扬")}</strong></div></div><div class="reward-note"><strong>家长，请认真回应孩子的这次坚持</strong><p>奖励不是交换，是让努力被看见</p></div></article><button class="primary-button" type="button" data-action="redeem" data-task-id="${task.id}">${icon(`${A}/reward-success.svg`)}<span>确认奖励已兑现</span></button><button class="primary-button" type="button" data-action="share" data-task-id="${task.id}">${icon(`${A}/share-success.svg`)}<span>生成分享卡</span></button><button class="plain-button" type="button" data-view="today">稍后处理</button></main></section>`;
}

function renderShare() {
  const task = getTask(state, ui.selectedTaskId);
  if (!task) {
    ui.view = "today";
    return renderToday();
  }
  const stats = calculateGlobalStats(state);
  const progress = getCurrentMilestone(state, task);
  const plaqueWood = `<span class="poster-woodgrain">${icon(`${A}/poster-wood-knot.svg`, "", "wood-knot-bottom")}${icon(`${A}/poster-wood-knot.svg`, "", "wood-knot-top")}${icon(`${A}/poster-wood-long.svg`, "", "wood-grain-long")}${icon(`${A}/poster-wood-short.svg`, "", "wood-grain-short")}${icon(`${A}/poster-wood-vertical.svg`, "", "wood-grain-vertical")}</span>`;
  const footerWood = `<span class="poster-footer-woodgrain">${icon(`${A}/poster-footer-knot-small.svg`, "", "footer-knot-small")}${icon(`${A}/poster-footer-knot-large.svg`, "", "footer-knot-large")}${icon(`${A}/poster-footer-grain-left.svg`, "", "footer-grain-left")}${icon(`${A}/poster-footer-grain-right.svg`, "", "footer-grain-right")}</span>`;
  return `<section class="share-screen">${pageHeader("分享", ui.returnView, "transparent")}<div id="sharePoster" class="share-poster"><div class="poster-top"><div class="poster-profile"><span class="poster-avatar">${icon(profileAvatarSrc(), "头像")}</span><span><strong>${escapeHtml(state.profile.nickname)}</strong><small>在天天打卡进步</small></span></div><div class="poster-days">${plaqueWood}<small>天 / 天 / 打 / 卡 / 天 / 天 / 进 / 步</small><span>坚持学习 <strong>${stats.cumulativeLabel}</strong> 天</span></div>${icon(`${A}/poster-lion.png?v=1.2.19`, "小狮子", "poster-lion")}<div class="poster-main-shell"><div class="poster-main"><div class="poster-ribbon"><i></i><span>今日完成</span><i></i></div><h2>${escapeHtml(task.title)}</h2><p>目标打卡${task.targetDays}天&nbsp;&nbsp;已完成打卡${countTaskCheckIns(state, task.id)}天</p><div class="poster-medal-ring">${icon(`${A}/poster-medal-ring.svg`, "", "poster-ring")}${medalMarkup(progress, progress.fill, "poster-medal")}</div></div></div>${icon(`${A}/poster-plant-left.svg`, "", "poster-plant poster-plant-left")}${icon(`${A}/poster-plant-right.svg`, "", "poster-plant poster-plant-right")}<div class="poster-separator"></div></div><footer>${footerWood}<div><strong>天天打卡&nbsp; 天天进步</strong><p>长按识别二维码，申请体验</p></div><span class="poster-qr-frame">${icon(`${A}/qr-code.png`, "体验二维码", "poster-qr")}</span></footer></div><button class="save-poster-button" type="button" data-action="save-poster" disabled>${icon(`${A}/poster-save.svg`)}<span>保存海报至相册</span></button></section>`;
}

function renderModal() {
  const modal = ui.modal;
  let body = "";
  if (modal.type === "checkin") {
    const task = getTask(state, modal.taskId);
    body = `${icon(`${A}/modal-lion.png?v=1.2.19`, "小狮子", "sheet-lion")}<h2>今天完成了吗？</h2><strong class="sheet-task">${escapeHtml(task.title)}</strong><div class="sheet-notice">${icon(`${A}/modal-success.svg`)}<span>确认后，${getCurrentMilestone(state, task).name}勋章将变为 ${getCurrentMilestone(state, task).segmentDone + 1}/${getCurrentMilestone(state, task).segmentTarget}</span></div><button class="primary-button" data-action="confirm-checkin" data-task-id="${task.id}" type="button">确认完成</button><button class="plain-button" data-action="close-modal" type="button">再等等</button>`;
  } else if (modal.type === "makeup" || modal.type === "revoke") {
    const makeup = modal.type === "makeup";
    body = `${icon(`${A}/modal-lion.png?v=1.2.19`, "小狮子", "sheet-lion")}<h2>${makeup ? "请说明补卡情况" : "请说明撤销情况"}</h2><form id="${makeup ? "makeupForm" : "revokeForm"}">${makeup && !modal.date ? `<div class="field"><label for="makeupDate">补卡日期</label><input class="field-control" id="makeupDate" name="date" type="date" max="${previousDate()}" required></div>` : makeup ? `<input type="hidden" name="date" value="${modal.date}"><p class="fixed-date">补卡日期：${formatDate(modal.date, true)}</p>` : ""}<div class="field"><textarea class="reason-control" id="reason" name="reason" maxlength="100" placeholder="请输入内容"></textarea><div class="field-meta"><span data-error="reason"></span><span data-count="reason">0/100</span></div></div><button class="primary-button" type="submit">确认完成</button><button class="plain-button" type="button" data-action="close-modal">再等等</button></form>`;
  } else if (modal.type === "confirm") {
    body = `${icon(`${A}/modal-lion.png?v=1.2.19`, "小狮子", "sheet-lion")}<h2>${escapeHtml(modal.title)}</h2><p class="confirm-message">${escapeHtml(modal.message)}</p><button class="primary-button" type="button" data-action="confirm-pending">确认</button><button class="plain-button" type="button" data-action="close-modal">取消</button>`;
  }
  modalRoot.innerHTML = `<div class="modal-scrim"><section class="bottom-sheet modal-${modal.type}" role="dialog" aria-modal="true" aria-label="${escapeHtml(modal.title || modal.type)}"><div class="drag-handle"></div>${body}</section></div>`;
}

function previousDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateISO(date);
}

function handleRuleError(error, form = null) {
  if (!(error instanceof RuleError)) throw error;
  const fieldByCode = {
    PROFILE_NICKNAME_REQUIRED: "nickname",
    PROFILE_NICKNAME_TOO_LONG: "nickname",
    TASK_TITLE_REQUIRED: "title",
    TASK_TITLE_TOO_LONG: "title",
    TASK_REWARD_TOO_LONG: "rewardText",
    REASON_REQUIRED: "reason",
    REASON_TOO_LONG: "reason"
  };
  const target = form?.querySelector(`[data-error="${fieldByCode[error.code]}"]`);
  if (target) target.textContent = error.message;
  else showToast(error.message);
}

app.addEventListener("click", (event) => {
  const control = event.target.closest("button, [data-view]");
  if (!control) return;
  const view = control.dataset.view;
  if (view) {
    ui.view = view;
    ui.success = null;
    ui.modal = null;
    if (view !== "edit") ui.editingTaskId = null;
    render();
    scrollAppTop();
    return;
  }
  const previousView = ui.view;
  const action = control.dataset.action;
  if (!action) return;
  const taskId = control.dataset.taskId;
  if (action === "toggle-growth") ui.growthExpanded = !ui.growthExpanded;
  if (action === "month-prev") ui.monthOffset -= 1;
  if (action === "month-next") ui.monthOffset += 1;
  if (action === "select-date") ui.selectedDate = control.dataset.date;
  if (action === "checkin") ui.modal = { type: "checkin", taskId };
  if (action === "records") { ui.selectedTaskId = taskId; ui.returnView = ui.view; ui.view = "records"; }
  if (action === "makeup") ui.modal = { type: "makeup", taskId, date: control.dataset.date || null };
  if (action === "revoke") ui.modal = { type: "revoke", checkInId: control.dataset.checkinId };
  if (action === "edit-task") { ui.editingTaskId = taskId; ui.view = "edit"; }
  if (action === "delete-task") ui.modal = { type: "confirm", pending: { type: "delete", taskId }, title: "确定删除这个任务？", message: "任务会从列表移除，已有记录仍然保留。" };
  if (action === "reward" || action === "open-reward") { ui.selectedTaskId = taskId; ui.success = null; ui.view = "reward"; }
  if (action === "redeem") ui.modal = { type: "confirm", pending: { type: "redeem", taskId }, title: "确认奖励已经兑现？", message: "确认后任务会归档结束。" };
  if (action === "share") { ui.selectedTaskId = taskId; ui.success = null; ui.returnView = ui.view; ui.view = "share"; }
  if (action === "close-success") { ui.success = null; ui.view = "today"; ui.selectedDate = localDateISO(); }
  if (action === "save-poster") { savePoster(); return; }
  render();
  if (ui.success || ui.view !== previousView) scrollAppTop();
});

modalRoot.addEventListener("click", (event) => {
  if (event.target.matches(".modal-scrim")) {
    ui.modal = null;
    render();
    return;
  }
  const control = event.target.closest("button");
  if (!control) return;
  if (control.dataset.action === "close-modal") { ui.modal = null; render(); }
  if (control.dataset.action === "confirm-checkin") completeDirectCheckIn(control.dataset.taskId);
  if (control.dataset.action === "confirm-pending") completePendingAction();
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "profileForm") submitProfile(event);
  if (event.target.id === "taskForm") submitTask(event);
  if (event.target.id === "makeupForm") submitMakeupReason(event);
  if (event.target.id === "revokeForm") submitRevokeReason(event);
});

document.addEventListener("input", (event) => {
  if (!event.target.id) return;
  const count = document.querySelector(`[data-count="${event.target.id}"]`);
  if (count) count.textContent = `${[...event.target.value].length}/${event.target.maxLength}`;
  const error = event.target.closest("form")?.querySelector(`[data-error="${event.target.name}"]`);
  if (error) error.textContent = "";
});

document.addEventListener("change", (event) => {
  if (event.target.id !== "avatarFile") return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    event.target.value = "";
    showToast("头像图片请控制在1MB以内");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const value = String(reader.result || "");
    document.querySelector("[data-avatar-preview]")?.setAttribute("src", value);
    const input = document.querySelector("[data-avatar-value]");
    if (input) input.value = value;
  };
  reader.readAsDataURL(file);
});

function submitProfile(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  try {
    persist(saveProfile(state, { nickname: data.get("nickname"), avatar: data.get("avatar"), gender: data.get("gender"), age: data.get("age") }));
    ui.view = "badges";
    render();
    scrollAppTop();
    showToast("个人信息已保存");
  } catch (error) {
    handleRuleError(error, form);
  }
}

function submitTask(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const input = { title: data.get("title"), targetDays: data.get("targetDays"), rewardText: data.get("rewardText") };
  try {
    persist(ui.editingTaskId ? editTask(state, ui.editingTaskId, input) : createTask(state, input));
    const wasEditing = Boolean(ui.editingTaskId);
    ui.editingTaskId = null;
    ui.view = wasEditing ? "publish" : "today";
    ui.selectedDate = localDateISO();
    render();
    scrollAppTop();
    showToast(wasEditing ? "任务已修改" : "任务已创建，可以开始打卡啦");
  } catch (error) {
    handleRuleError(error, form);
  }
}

function completeDirectCheckIn(taskId) {
  const task = getTask(state, taskId);
  const before = new Set(task.unlockedMilestones || []);
  try {
    const next = checkIn(state, { taskId, date: localDateISO(), type: "normal" });
    const nextTask = getTask(next, taskId);
    const newDays = nextTask.unlockedMilestones.find((days) => !before.has(days));
    persist(next);
    ui.modal = null;
    ui.success = { taskId, milestone: MILESTONES.find((item) => item.days === newDays) || null, final: nextTask.status === "completed" };
    render();
    scrollAppTop();
  } catch (error) {
    ui.modal = null;
    render();
    handleRuleError(error);
  }
}

function submitMakeupReason(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const date = data.get("date");
  const reason = String(data.get("reason") || "").trim();
  if (!date) { showToast("请选择补卡日期"); return; }
  if (!reason) { form.querySelector('[data-error="reason"]').textContent = "请填写原因"; return; }
  ui.modal = { type: "confirm", pending: { type: "makeup", taskId: ui.modal.taskId, date, reason }, title: `确认补上${formatDate(date)}？`, message: `补卡原因：${reason}` };
  renderModal();
}

function submitRevokeReason(event) {
  event.preventDefault();
  const form = event.target;
  const reason = String(new FormData(form).get("reason") || "").trim();
  if (!reason) { form.querySelector('[data-error="reason"]').textContent = "请填写原因"; return; }
  ui.modal = { type: "confirm", pending: { type: "revoke", checkInId: ui.modal.checkInId, reason }, title: "确认撤销这次打卡？", message: "撤销后任务进度和勋章会同步回退。" };
  renderModal();
}

function completePendingAction() {
  const pending = ui.modal.pending;
  try {
    if (pending.type === "makeup") persist(checkIn(state, { taskId: pending.taskId, date: pending.date, type: "makeup", reason: pending.reason }));
    if (pending.type === "revoke") persist(revokeCheckIn(state, pending.checkInId, pending.reason));
    if (pending.type === "delete") { persist(deleteTask(state, pending.taskId)); ui.editingTaskId = null; ui.view = "publish"; }
    if (pending.type === "redeem") { persist(redeemReward(state, pending.taskId)); ui.view = "today"; }
    const message = { makeup: "补卡成功，进度已经更新", revoke: "已撤销，进度和勋章已回退", delete: "任务已删除", redeem: "奖励已兑现，任务归档完成" }[pending.type];
    ui.modal = null;
    render();
    if (["delete", "redeem"].includes(pending.type)) scrollAppTop();
    showToast(message);
  } catch (error) {
    ui.modal = null;
    render();
    handleRuleError(error);
  }
}

async function preparePoster() {
  const task = getTask(state, ui.selectedTaskId);
  const poster = document.getElementById("sharePoster");
  if (!poster) return;
  const token = ++posterPreparationToken;
  preparedPoster = null;
  await document.fonts.ready;
  const clone = poster.cloneNode(true);
  inlinePosterStyles(poster, clone);
  await inlinePosterImages(clone);
  clone.style.margin = "0";
  const canvas = document.createElement("canvas");
  canvas.width = 702;
  canvas.height = 1194;
  const context = canvas.getContext("2d");
  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="351" height="597"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:351px;height:597px;padding:6px">${markup}</div></foreignObject></svg>`;
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const posterBlob = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("海报生成失败")), "image/png"));
  if (token !== posterPreparationToken || ui.view !== "share") return;
  preparedPoster = { blob: posterBlob, taskId: task.id, title: task.title, width: canvas.width, height: canvas.height };
  const button = document.querySelector('[data-action="save-poster"]');
  if (button) button.disabled = false;
}

function savePoster() {
  if (!preparedPoster || preparedPoster.taskId !== ui.selectedTaskId) {
    showToast("海报生成中，请稍后再试");
    return;
  }
  const link = document.createElement("a");
  link.download = `天天打卡-${preparedPoster.title}.png`;
  link.href = URL.createObjectURL(preparedPoster.blob);
  document.body.appendChild(link);
  link.click();
  document.querySelector(".share-screen")?.setAttribute("data-export", `${preparedPoster.width}x${preparedPoster.height}:${preparedPoster.blob.size}`);
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  showToast("海报已保存");
}

function inlinePosterStyles(source, target) {
  const styles = getComputedStyle(source);
  target.style.cssText = [...styles].map((property) => `${property}:${styles.getPropertyValue(property)};`).join("");
  [...source.children].forEach((child, index) => inlinePosterStyles(child, target.children[index]));
}

async function inlinePosterImages(root) {
  await Promise.all([...root.querySelectorAll("img")].map(async (image) => {
    const response = await fetch(image.src);
    const blob = await response.blob();
    image.src = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

window.__tiantian = {
  getState: () => JSON.parse(JSON.stringify(state)),
  reset: () => { localStorage.removeItem(STORAGE_KEY); state = createEmptyState(); ui = createUiState(); render(); },
  seedDemo: () => { persist(seedDemoState()); ui = createUiState(); render(); },
  storageKey: STORAGE_KEY
};

render();
