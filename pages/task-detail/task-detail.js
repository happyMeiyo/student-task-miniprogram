// pages/task-detail/task-detail.js
const app = getApp();

Page({
  data: {
    taskId: '',
    task: null,
    // 编辑中的临时数据
    editName: '',
    editIcon: '',
    editTime: 0,
    editColor: '',
    colors: [
      '#FF7F7F', '#6EC6F5', '#5CC97A', '#B57BEE',
      '#FFAC6A', '#FFD95A', '#FF6BAE', '#4ECDC4'
    ],
    icons: ['📖', '🔢', '🌍', '📚', '⚽', '🎵', '🎨', '🏃', '🔬', '✏️', '📝', '🎭', '🎯', '🏊', '🎸', '🌱'],
    showIconPicker: false,
    // 子任务编辑
    editingSubId: '',
    editSubName: '',
    editSubTime: 0,
    showSubEditModal: false,
    showAddSubModal: false,
    newSubName: '',
    newSubTime: 10,
  },

  onLoad(options) {
    const { taskId, dateKey } = options;
    this._dateKey = dateKey || '';
    this._isHistorical = dateKey ? dateKey < getApp().getTodayKey() : false;
    this.setData({ taskId });
    this.loadTask(taskId);
  },

  loadTask(taskId) {
    // 历史日期从每日记录快照读取，今天/未来从全局 tasks 读取
    var tasks;
    if (this._isHistorical) {
      var record = wx.getStorageSync('dailyRecord_' + this._dateKey);
      tasks = (record && record.tasks) || [];
    } else {
      tasks = wx.getStorageSync('tasks') || [];
    }
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      wx.showToast({ title: '任务不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({
      task: JSON.parse(JSON.stringify(task)),
      editName: task.name,
      editIcon: task.icon,
      editTime: task.estimatedTime,
      editColor: task.color,
    });
  },

  // 读取当前编辑的任务列表（区分历史/当天）
  _getEditTasks() {
    if (this._isHistorical) {
      var record = wx.getStorageSync('dailyRecord_' + this._dateKey);
      return (record && record.tasks) || [];
    }
    return wx.getStorageSync('tasks') || [];
  },

  // 保存任务列表到对应存储位置
  _saveEditTasks(tasks) {
    if (this._isHistorical) {
      var record = wx.getStorageSync('dailyRecord_' + this._dateKey) || {};
      record.tasks = tasks;
      wx.setStorageSync('dailyRecord_' + this._dateKey, record);
    } else {
      wx.setStorageSync('tasks', tasks);
    }
    app.notifyDataChange();
  },

  // 保存主任务基本信息
  saveTask() {
    const { taskId, editName, editIcon, editTime, editColor } = this.data;
    if (!editName.trim()) {
      wx.showToast({ title: '任务名不能为空', icon: 'none' });
      return;
    }

    let tasks = this._getEditTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;

    tasks[idx] = {
      ...tasks[idx],
      name: editName.trim(),
      icon: editIcon,
      estimatedTime: Number(editTime) || 30,
      color: editColor,
    };

    this._saveEditTasks(tasks);

    setTimeout(() => {
      wx.navigateBack();
    }, 500);
  },

  onNameInput(e) { this.setData({ editName: e.detail.value }); },
  onTimeInput(e) { this.setData({ editTime: e.detail.value }); },

  selectColor(e) {
    this.setData({ editColor: e.currentTarget.dataset.color });
  },

  toggleIconPicker() {
    this.setData({ showIconPicker: !this.data.showIconPicker });
  },

  selectIcon(e) {
    this.setData({ editIcon: e.currentTarget.dataset.icon, showIconPicker: false });
  },

  // ─── 子任务管理 ───

  // 显示添加子任务弹窗
  showAddSub() {
    this.setData({ showAddSubModal: true, newSubName: '', newSubTime: 10 });
  },

  closeAddSub() {
    this.setData({ showAddSubModal: false });
  },

  onNewSubNameInput(e) { this.setData({ newSubName: e.detail.value }); },
  onNewSubTimeInput(e) { this.setData({ newSubTime: e.detail.value }); },

  addSubTask() {
    const { newSubName, newSubTime, taskId } = this.data;
    if (!newSubName.trim()) {
      wx.showToast({ title: '子任务名不能为空', icon: 'none' });
      return;
    }

    let tasks = this._getEditTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;

    const newSub = {
      id: app.generateId(),
      name: newSubName.trim(),
      done: false,
      estimatedTime: Number(newSubTime) || 10,
    };

    if (!tasks[idx].subTasks) tasks[idx].subTasks = [];
    tasks[idx].subTasks.push(newSub);
    this._saveEditTasks(tasks);

    this.setData({
      task: JSON.parse(JSON.stringify(tasks[idx])),
      showAddSubModal: false,
    });
  },

  // 显示编辑子任务弹窗
  editSubTask(e) {
    const { subId } = e.currentTarget.dataset;
    const sub = this.data.task.subTasks.find(s => s.id === subId);
    if (!sub) return;
    this.setData({
      editingSubId: subId,
      editSubName: sub.name,
      editSubTime: sub.estimatedTime,
      showSubEditModal: true,
    });
  },

  closeSubEdit() {
    this.setData({ showSubEditModal: false, editingSubId: '' });
  },

  onEditSubNameInput(e) { this.setData({ editSubName: e.detail.value }); },
  onEditSubTimeInput(e) { this.setData({ editSubTime: e.detail.value }); },

  saveSubTask() {
    const { editingSubId, editSubName, editSubTime, taskId } = this.data;
    if (!editSubName.trim()) {
      wx.showToast({ title: '子任务名不能为空', icon: 'none' });
      return;
    }

    let tasks = this._getEditTasks();
    const tIdx = tasks.findIndex(t => t.id === taskId);
    if (tIdx === -1) return;

    const sIdx = tasks[tIdx].subTasks.findIndex(s => s.id === editingSubId);
    if (sIdx === -1) return;

    tasks[tIdx].subTasks[sIdx] = {
      ...tasks[tIdx].subTasks[sIdx],
      name: editSubName.trim(),
      estimatedTime: Number(editSubTime) || 10,
    };

    this._saveEditTasks(tasks);

    this.setData({
      task: JSON.parse(JSON.stringify(tasks[tIdx])),
      showSubEditModal: false,
    });
    wx.showToast({ title: '已保存 ✅', icon: 'none' });
  },

  // 删除子任务
  deleteSubTask(e) {
    const { subId } = e.currentTarget.dataset;
    const that = this;
    wx.showModal({
      title: '删除子任务',
      content: '确定要删除这个子任务吗？',
      confirmColor: '#FF7F7F',
      success: (res) => {
        if (!res.confirm) return;
        const { taskId } = that.data;
        let tasks = that._getEditTasks();
        const tIdx = tasks.findIndex(t => t.id === taskId);
        if (tIdx === -1) return;
        tasks[tIdx].subTasks = tasks[tIdx].subTasks.filter(s => s.id !== subId);
        that._saveEditTasks(tasks);
        that.setData({ task: JSON.parse(JSON.stringify(tasks[tIdx])) });
      }
    });
  },

  // 上移子任务
  moveSubUp(e) {
    const { subId } = e.currentTarget.dataset;
    const { taskId } = this.data;
    let tasks = this._getEditTasks();
    const tIdx = tasks.findIndex(t => t.id === taskId);
    if (tIdx === -1) return;
    const subs = tasks[tIdx].subTasks;
    const idx = subs.findIndex(s => s.id === subId);
    if (idx <= 0) return;
    [subs[idx - 1], subs[idx]] = [subs[idx], subs[idx - 1]];
    this._saveEditTasks(tasks);
    this.setData({ task: JSON.parse(JSON.stringify(tasks[tIdx])) });
  },

  // 下移子任务
  moveSubDown(e) {
    const { subId } = e.currentTarget.dataset;
    const { taskId } = this.data;
    let tasks = this._getEditTasks();
    const tIdx = tasks.findIndex(t => t.id === taskId);
    if (tIdx === -1) return;
    const subs = tasks[tIdx].subTasks;
    const idx = subs.findIndex(s => s.id === subId);
    if (idx >= subs.length - 1) return;
    [subs[idx], subs[idx + 1]] = [subs[idx + 1], subs[idx]];
    this._saveEditTasks(tasks);
    this.setData({ task: JSON.parse(JSON.stringify(tasks[tIdx])) });
  },

  goBack() {
    wx.navigateBack();
  },
});
