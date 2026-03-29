// pages/settings/settings.js
// PDF 导出方案：
//   1. 在小程序内用 Canvas 绘制任务清单
//   2. 转为图片临时文件
//   3. 用 wx.getFileSystemManager 将图片写入本地文件系统
//   4. 调用 wx.shareFileMessage 分享 PDF（实质为调用系统打印/分享）
//   或更简单：直接打开内嵌 WebView 加载本地 HTML，H5 用 jsPDF 生成
const app = getApp();

Page({
  data: {
    studentName: '',
    totalTasks: 0,
    completedToday: 0,
    progress: 0,
    editingName: false,
    tempName: '',
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const studentName = wx.getStorageSync('studentName') || '同学';
    const tasks = wx.getStorageSync('tasks') || [];
    const today = app.getTodayKey();
    const record = wx.getStorageSync('dailyRecord_' + today) || { subCompletedIds: [] };

    let totalSub = 0, completedSub = 0;
    tasks.forEach(t => {
      (t.subTasks || []).forEach(s => {
        totalSub++;
        if ((record.subCompletedIds || []).includes(s.id)) completedSub++;
      });
    });

    const progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

    this.setData({
      studentName,
      totalTasks: tasks.length,
      completedToday: completedSub,
      progress,
      tempName: studentName,
    });
  },

  startEditName() {
    this.setData({ editingName: true, tempName: this.data.studentName });
  },

  onNameInput(e) {
    this.setData({ tempName: e.detail.value });
  },

  saveName() {
    const { tempName } = this.data;
    if (!tempName.trim()) {
      wx.showToast({ title: '名字不能为空', icon: 'none' });
      return;
    }
    wx.setStorageSync('studentName', tempName.trim());
    app.notifyDataChange();
    this.setData({ studentName: tempName.trim(), editingName: false });
    wx.showToast({ title: '保存成功', icon: 'success' });
  },

  cancelEditName() {
    this.setData({ editingName: false });
  },

  // ─── 核心：导出 PDF ───
  // 方案：跳转到内置 export-pdf 页面，该页面用 web-view 加载本地 HTML
  // 本地 HTML 使用 jsPDF 生成并下载 PDF
  exportToPDF() {
    // 将任务数据存到 storage，由 webview 页面读取
    const tasks = wx.getStorageSync('tasks') || [];
    const today = app.getTodayKey();
    const record = wx.getStorageSync('dailyRecord_' + today) || { subCompletedIds: [] };
    const studentName = this.data.studentName;

    const d = new Date();
    const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    const days = ['日','一','二','三','四','五','六'];
    const weekday = '星期' + days[d.getDay()];

    // 将导出数据暂存
    wx.setStorageSync('pendingExportData', {
      studentName,
      dateStr,
      weekday,
      tasks,
      completedSubIds: record.subCompletedIds || [],
    });

    wx.navigateTo({ url: '/pages/export-pdf/export-pdf' });
  },

  clearAllData() {
    wx.showModal({
      title: '⚠️ 清除所有数据',
      content: '这将删除所有任务和历史记录，无法恢复，确认吗？',
      confirmColor: '#FF7F7F',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '已清除', icon: 'success' });
          setTimeout(() => {
            getApp().onLaunch();
            this.loadData();
          }, 500);
        }
      }
    });
  },

  resetDefaultTasks() {
    wx.showModal({
      title: '恢复默认任务',
      content: '将恢复默认的6个任务，当前自定义任务会被替换',
      confirmColor: '#6EC6F5',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('tasks');
          getApp().onLaunch();
          this.loadData();
          wx.showToast({ title: '已恢复默认', icon: 'success' });
        }
      }
    });
  },

  syncData() {
    const that = this;
    wx.showLoading({ title: '同步中...' });
    app.cloudSync(function (result) {
      wx.hideLoading();
      if (result === 'downloaded') {
        that.loadData();
        wx.showToast({ title: '已同步云端数据', icon: 'success' });
      } else if (result === 'uploaded') {
        wx.showToast({ title: '已上传到云端', icon: 'success' });
      } else if (result === 'synced') {
        wx.showToast({ title: '数据已是最新', icon: 'success' });
      } else {
        wx.showToast({ title: '同步失败，请检查网络', icon: 'none' });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '每日任务清单 - 专为小学生设计的任务管理工具',
      path: '/pages/index/index',
    };
  },
});
