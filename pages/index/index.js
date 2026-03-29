// pages/index/index.js
var app = getApp();

Page({
  data: {
    studentName: '同学',
    todayDate: '',
    weekday: '',
    tasks: [],
    subDoneMap: {},
    progress: 0,
    totalSubTasks: 0,
    completedSubTasks: 0,
    greeting: '',
    dateTabs: [],
    isToday: true,
  },

  onLoad: function () {
    this.loadData();
  },

  onShow: function () {
    this.loadData();
  },

  loadData: function (dateKey) {
    // 读取任务列表
    var tasks = wx.getStorageSync('tasks');
    if (!tasks || !tasks.length) {
      app.onLaunch();
      tasks = wx.getStorageSync('tasks') || [];
    }

    var studentName = wx.getStorageSync('studentName') || '同学';
    var todayKey = app.getTodayKey();
    var selectedDateKey = dateKey || todayKey;
    // 今天或未来日期视为可编辑（显示实时任务、可勾选）
    var isToday = (selectedDateKey >= todayKey);

    // 读取选中日期的完成记录
    var record = wx.getStorageSync('dailyRecord_' + selectedDateKey) || {
      completedIds: [],
      subCompletedIds: []
    };

    // 今天/未来：用实时任务；历史：用快照（无快照则为空）
    var displayTasks;
    if (isToday) {
      displayTasks = tasks;
      // 同步快照到当天记录
      record.tasks = tasks;
      try { wx.setStorageSync('dailyRecord_' + selectedDateKey, record); } catch (e) { }
    } else {
      displayTasks = (record.tasks && record.tasks.length > 0) ? record.tasks : [];
    }

    // 日期文案
    var d = new Date(selectedDateKey.replace(/-/g, '/'));
    var weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    var todayDate = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    var weekday = '星期' + weekNames[d.getDay()];

    // 计算进度
    var totalSub = 0;
    var completedSub = 0;
    var subCompletedIds = record.subCompletedIds || [];
    for (var i = 0; i < displayTasks.length; i++) {
      var t = displayTasks[i];
      if (t.subTasks && t.subTasks.length > 0) {
        totalSub += t.subTasks.length;
        for (var j = 0; j < t.subTasks.length; j++) {
          if (subCompletedIds.indexOf(t.subTasks[j].id) !== -1) {
            completedSub++;
          }
        }
      }
    }
    var progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

    // 问候语
    var hour = new Date().getHours();
    var greeting = hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

    // 子任务完成映射
    var subDoneMap = {};
    for (var k = 0; k < subCompletedIds.length; k++) {
      subDoneMap[subCompletedIds[k]] = true;
    }

    // 构建7天日期标签
    var dateTabs = this._buildDateTabs(selectedDateKey);

    // 仅 JS 内部使用的状态，不传入渲染层
    this._completedIds = record.completedIds || [];
    this._subCompletedIds = subCompletedIds;
    this._selectedDateKey = selectedDateKey;

    this.setData({
      tasks: displayTasks,
      studentName: studentName,
      todayDate: todayDate,
      weekday: weekday,
      subDoneMap: subDoneMap,
      progress: progress,
      totalSubTasks: totalSub,
      completedSubTasks: completedSub,
      greeting: greeting,
      dateTabs: dateTabs,
      isToday: isToday,
    });
  },

  _buildDateTabs: function (selectedKey) {
    var weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    var tabs = [];
    // 今日前4天 + 今日 + 今日后2天，共7天
    for (var offset = -4; offset <= 2; offset++) {
      var d = new Date();
      d.setDate(d.getDate() + offset);
      var key = app.getDateKey(d);
      var record = wx.getStorageSync('dailyRecord_' + key);
      var label = '周' + weekNames[d.getDay()];
      if (offset === 0) label = '今日';
      tabs.push({
        key: key,
        weekday: label,
        selected: key === selectedKey,
        hasRecord: !!record && !!(record.subCompletedIds) && record.subCompletedIds.length > 0,
      });
    }
    return tabs;
  },

  switchDate: function (e) {
    var key = e.currentTarget.dataset.key;
    this.loadData(key);
  },

  toggleSubTask: function (e) {
    if (!this.data.isToday) {
      wx.showToast({ title: '历史记录不可修改', icon: 'none' });
      return;
    }
    var taskId = e.currentTarget.dataset.taskId;
    var subId = e.currentTarget.dataset.subId;
    var today = this._selectedDateKey || app.getTodayKey();
    var subCompletedIds = (this._subCompletedIds || []).slice();
    var completedIds = (this._completedIds || []).slice();

    var idx = subCompletedIds.indexOf(subId);
    if (idx !== -1) {
      subCompletedIds.splice(idx, 1);
    } else {
      subCompletedIds.push(subId);
    }

    // 检查主任务是否全部完成
    var tasks = this.data.tasks;
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) { task = tasks[i]; break; }
    }
    if (task && task.subTasks) {
      var allDone = true;
      for (var j = 0; j < task.subTasks.length; j++) {
        if (subCompletedIds.indexOf(task.subTasks[j].id) === -1) {
          allDone = false;
          break;
        }
      }
      if (allDone && completedIds.indexOf(taskId) === -1) {
        completedIds.push(taskId);
        wx.showToast({ title: task.name + ' 完成啦！', icon: 'none', duration: 1500 });
      } else if (!allDone) {
        var ci = completedIds.indexOf(taskId);
        if (ci !== -1) completedIds.splice(ci, 1);
      }
    }

    // 计算进度
    var totalSub = 0, completedSub = 0;
    for (var m = 0; m < tasks.length; m++) {
      if (tasks[m].subTasks) {
        totalSub += tasks[m].subTasks.length;
        for (var n = 0; n < tasks[m].subTasks.length; n++) {
          if (subCompletedIds.indexOf(tasks[m].subTasks[n].id) !== -1) completedSub++;
        }
      }
    }
    var progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

    var record = { completedIds: completedIds, subCompletedIds: subCompletedIds, tasks: tasks };
    wx.setStorageSync('dailyRecord_' + today, record);


    var subDoneMap = {};
    for (var p = 0; p < subCompletedIds.length; p++) {
      subDoneMap[subCompletedIds[p]] = true;
    }

    this._completedIds = completedIds;
    this._subCompletedIds = subCompletedIds;

    this.setData({
      subDoneMap: subDoneMap,
      progress: progress,
      completedSubTasks: completedSub,
    });
  },

  goToDetail: function (e) {
    var taskId = e.currentTarget.dataset.taskId;
    wx.navigateTo({ url: '/pages/task-detail/task-detail?taskId=' + taskId });
  },

  goToAddTask: function () {
    wx.navigateTo({ url: '/pages/add-task/add-task' });
  },

  deleteTask: function (e) {
    var that = this;
    var taskId = e.currentTarget.dataset.taskId;
    wx.showModal({
      title: '删除任务',
      content: '确定要删除这个任务吗？',
      confirmColor: '#FF7F7F',
      success: function (res) {
        if (res.confirm) {
          var tasks = wx.getStorageSync('tasks') || [];
          var newTasks = [];
          for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].id !== taskId) newTasks.push(tasks[i]);
          }
          wx.setStorageSync('tasks', newTasks);
      
          that.loadData(that._selectedDateKey);
        }
      }
    });
  },

  onShareAppMessage: function () {
    var studentName = this.data.studentName || '同学';
    var progress = this.data.progress || 0;
    var completedSub = this.data.completedSubTasks || 0;
    var totalSub = this.data.totalSubTasks || 0;
    var title = studentName + '的今日任务 - 已完成' + completedSub + '/' + totalSub + '（' + progress + '%）';

    return {
      title: title,
      path: '/pages/index/index',
    };
  },
});
