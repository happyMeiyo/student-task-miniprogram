// pages/add-task/add-task.js
const app = getApp();

Page({
  data: {
    name: '',
    icon: '📝',
    estimatedTime: 30,
    color: '#6EC6F5',
    category: 'homework',
    colors: [
      '#FF7F7F', '#6EC6F5', '#5CC97A', '#B57BEE',
      '#FFAC6A', '#FFD95A', '#FF6BAE', '#4ECDC4'
    ],
    icons: ['📖', '🔢', '🌍', '📚', '⚽', '🎵', '🎨', '🏃', '🔬', '✏️', '📝', '🎭', '🎯', '🏊', '🎸', '🌱'],
    categories: [
      { id: 'homework', name: '作业', icon: '📚' },
      { id: 'study', name: '学习', icon: '🔬' },
      { id: 'exercise', name: '运动', icon: '⚽' },
      { id: 'interest', name: '兴趣', icon: '🎵' },
      { id: 'other', name: '其他', icon: '📋' },
    ],
    showIconPicker: false,
    subTasks: [],
    showAddSubModal: false,
    newSubName: '',
    newSubTime: 10,
  },

  onLoad() {},

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onTimeInput(e) { this.setData({ estimatedTime: e.detail.value }); },

  selectColor(e) { this.setData({ color: e.currentTarget.dataset.color }); },
  selectIcon(e) { this.setData({ icon: e.currentTarget.dataset.icon, showIconPicker: false }); },
  toggleIconPicker() { this.setData({ showIconPicker: !this.data.showIconPicker }); },
  selectCategory(e) { this.setData({ category: e.currentTarget.dataset.id }); },

  // 子任务
  showAddSub() { this.setData({ showAddSubModal: true, newSubName: '', newSubTime: 10 }); },
  closeAddSub() { this.setData({ showAddSubModal: false }); },
  onNewSubNameInput(e) { this.setData({ newSubName: e.detail.value }); },
  onNewSubTimeInput(e) { this.setData({ newSubTime: e.detail.value }); },

  addSubTask() {
    const { newSubName, newSubTime, subTasks } = this.data;
    if (!newSubName.trim()) {
      wx.showToast({ title: '请输入子任务名称', icon: 'none' });
      return;
    }
    const newSub = {
      id: app.generateId(),
      name: newSubName.trim(),
      done: false,
      estimatedTime: Number(newSubTime) || 10,
    };
    this.setData({ subTasks: [...subTasks, newSub], showAddSubModal: false });
  },

  removeSubTask(e) {
    const { subId } = e.currentTarget.dataset;
    this.setData({ subTasks: this.data.subTasks.filter(s => s.id !== subId) });
  },

  // 提交创建
  createTask() {
    const { name, icon, estimatedTime, color, category, subTasks } = this.data;
    if (!name.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' });
      return;
    }

    const newTask = {
      id: app.generateId(),
      name: name.trim(),
      icon,
      estimatedTime: Number(estimatedTime) || 30,
      color,
      category,
      subTasks: subTasks,
    };

    let tasks = wx.getStorageSync('tasks') || [];
    tasks.push(newTask);
    wx.setStorageSync('tasks', tasks);

    wx.showToast({ title: '创建成功 🎉', icon: 'none', duration: 1500 });
    setTimeout(() => wx.navigateBack(), 1000);
  },

  goBack() { wx.navigateBack(); },
});
