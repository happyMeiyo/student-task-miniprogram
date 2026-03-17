// pages/index/index.js
const app = getApp();

Page({
  data: {
    studentName: '同学',
    todayDate: '',
    weekday: '',
    tasks: [],
    completedIds: [],
    subCompletedIds: [],
    subDoneMap: {},  // { subId: true } 用于模板中快速判断完成状态
    progress: 0,
    totalSubTasks: 0,
    completedSubTasks: 0,
    greeting: '',
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const tasks = wx.getStorageSync('tasks') || [];
    const studentName = wx.getStorageSync('studentName') || '同学';
    const today = app.getTodayKey();
    const record = wx.getStorageSync('dailyRecord_' + today) || { completedIds: [], subCompletedIds: [] };

    // 计算日期
    const d = new Date();
    const todayDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    const weekday = app.getWeekdayCN();

    // 计算进度
    let totalSub = 0, completedSub = 0;
    tasks.forEach(t => {
      if (t.subTasks && t.subTasks.length > 0) {
        totalSub += t.subTasks.length;
        t.subTasks.forEach(s => {
          if (record.subCompletedIds.includes(s.id)) completedSub++;
        });
      }
    });

    const progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
    const hour = d.getHours();
    let greeting = hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

    const subDoneMap = {};
    (record.subCompletedIds || []).forEach(id => { subDoneMap[id] = true; });

    this.setData({
      tasks,
      studentName,
      todayDate,
      weekday,
      completedIds: record.completedIds || [],
      subCompletedIds: record.subCompletedIds || [],
      subDoneMap,
      progress,
      totalSubTasks: totalSub,
      completedSubTasks: completedSub,
      greeting,
    });
  },

  // 判断主任务是否完成（所有子任务都完成）
  isTaskDone(task) {
    if (!task.subTasks || task.subTasks.length === 0) {
      return this.data.completedIds.includes(task.id);
    }
    return task.subTasks.every(s => this.data.subCompletedIds.includes(s.id));
  },

  // 切换子任务完成状态
  toggleSubTask(e) {
    const { taskId, subId } = e.currentTarget.dataset;
    const today = app.getTodayKey();
    let { subCompletedIds, completedIds } = this.data;
    subCompletedIds = [...subCompletedIds];
    completedIds = [...completedIds];

    if (subCompletedIds.includes(subId)) {
      subCompletedIds = subCompletedIds.filter(id => id !== subId);
    } else {
      subCompletedIds.push(subId);
    }

    // 检查主任务是否全部完成
    const tasks = this.data.tasks;
    const task = tasks.find(t => t.id === taskId);
    if (task && task.subTasks) {
      const allDone = task.subTasks.every(s => subCompletedIds.includes(s.id));
      if (allDone && !completedIds.includes(taskId)) {
        completedIds.push(taskId);
        wx.showToast({ title: `${task.name} 完成啦！🎉`, icon: 'none', duration: 1500 });
      } else if (!allDone) {
        completedIds = completedIds.filter(id => id !== taskId);
      }
    }

    // 计算进度
    let totalSub = 0, completedSub = 0;
    tasks.forEach(t => {
      if (t.subTasks) {
        totalSub += t.subTasks.length;
        t.subTasks.forEach(s => { if (subCompletedIds.includes(s.id)) completedSub++; });
      }
    });
    const progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

    const record = { completedIds, subCompletedIds };
    wx.setStorageSync('dailyRecord_' + today, record);

    const subDoneMap = {};
    subCompletedIds.forEach(id => { subDoneMap[id] = true; });

    this.setData({ subCompletedIds, completedIds, subDoneMap, progress, completedSubTasks: completedSub });
  },

  // 跳转到任务详情/编辑
  goToDetail(e) {
    const { taskId } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/task-detail/task-detail?taskId=${taskId}` });
  },

  // 添加新任务
  goToAddTask() {
    wx.navigateTo({ url: '/pages/add-task/add-task' });
  },

  // 重置今日记录
  resetToday() {
    wx.showModal({
      title: '重置今日任务',
      content: '确定要重置今天所有任务的完成状态吗？',
      confirmText: '重置',
      confirmColor: '#FF7F7F',
      success: (res) => {
        if (res.confirm) {
          const today = app.getTodayKey();
          wx.setStorageSync('dailyRecord_' + today, { completedIds: [], subCompletedIds: [] });
          this.setData({
            completedIds: [],
            subCompletedIds: [],
            subDoneMap: {},
            progress: 0,
            completedSubTasks: 0,
          });
          wx.showToast({ title: '已重置', icon: 'success' });
        }
      }
    });
  },

  // 导出PDF：跳转到选择任务页面
  showExport() {
    const tasks = wx.getStorageSync('tasks') || [];
    const today = app.getTodayKey();
    const record = wx.getStorageSync('dailyRecord_' + today) || { subCompletedIds: [] };
    const studentName = this.data.studentName;

    const d = new Date();
    const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    const days = ['日','一','二','三','四','五','六'];
    const weekday = '星期' + days[d.getDay()];

    wx.setStorageSync('pendingExportData', {
      studentName,
      dateStr,
      weekday,
      tasks,
      completedSubIds: record.subCompletedIds || [],
    });

    wx.navigateTo({ url: '/pages/export-pdf/export-pdf' });
  },

  // 删除任务
  deleteTask(e) {
    const { taskId } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除任务',
      content: '确定要删除这个任务吗？',
      confirmColor: '#FF7F7F',
      success: (res) => {
        if (res.confirm) {
          let tasks = wx.getStorageSync('tasks') || [];
          tasks = tasks.filter(t => t.id !== taskId);
          wx.setStorageSync('tasks', tasks);
          this.loadData();
        }
      }
    });
  },

  // 获取任务颜色样式（用于WXSS不支持动态颜色的情况）
  getTaskStyle(task) {
    return `border-left: 8rpx solid ${task.color}`;
  },
});
