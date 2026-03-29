// app.js
App({
  onLaunch() {
    // 初始化默认任务数据
    const tasks = wx.getStorageSync('tasks');
    if (!tasks || tasks.length === 0) {
      const defaultTasks = [
        {
          id: 'hw_chinese',
          name: '语文作业',
          icon: '📖',
          color: '#FF7F7F',
          category: 'homework',
          estimatedTime: 30,
          subTasks: [
            { id: 'sub_1', name: '抄写生字', done: false, estimatedTime: 10 },
            { id: 'sub_2', name: '完成练习册', done: false, estimatedTime: 15 },
            { id: 'sub_3', name: '朗读课文', done: false, estimatedTime: 5 }
          ]
        },
        {
          id: 'hw_math',
          name: '数学作业',
          icon: '🔢',
          color: '#6EC6F5',
          category: 'homework',
          estimatedTime: 30,
          subTasks: [
            { id: 'sub_4', name: '完成口算题', done: false, estimatedTime: 10 },
            { id: 'sub_5', name: '应用题练习', done: false, estimatedTime: 20 }
          ]
        },
        {
          id: 'hw_english',
          name: '英语作业',
          icon: '🌍',
          color: '#5CC97A',
          category: 'homework',
          estimatedTime: 25,
          subTasks: [
            { id: 'sub_6', name: '背单词', done: false, estimatedTime: 10 },
            { id: 'sub_7', name: '完成练习', done: false, estimatedTime: 15 }
          ]
        },
        {
          id: 'reading',
          name: '课外阅读',
          icon: '📚',
          color: '#B57BEE',
          category: 'study',
          estimatedTime: 20,
          subTasks: [
            { id: 'sub_8', name: '阅读20页', done: false, estimatedTime: 20 }
          ]
        },
        {
          id: 'exercise',
          name: '运动锻炼',
          icon: '⚽',
          color: '#FFAC6A',
          category: 'exercise',
          estimatedTime: 30,
          subTasks: [
            { id: 'sub_9', name: '跳绳5分钟', done: false, estimatedTime: 5 },
            { id: 'sub_10', name: '户外活动', done: false, estimatedTime: 25 }
          ]
        },
        {
          id: 'piano',
          name: '兴趣爱好',
          icon: '🎵',
          color: '#FFD95A',
          category: 'interest',
          estimatedTime: 20,
          subTasks: [
            { id: 'sub_11', name: '练习乐器', done: false, estimatedTime: 20 }
          ]
        }
      ];
      wx.setStorageSync('tasks', defaultTasks);
    }

    // 初始化每日记录（含当天任务快照）
    const today = this.getTodayKey();
    const currentTasks = wx.getStorageSync('tasks') || [];
    const dailyRecord = wx.getStorageSync('dailyRecord_' + today);
    if (!dailyRecord) {
      wx.setStorageSync('dailyRecord_' + today, {
        completedIds: [],
        subCompletedIds: [],
        tasks: currentTasks,
      });
    } else if (!dailyRecord.tasks) {
      // 兼容旧记录：补充任务快照
      dailyRecord.tasks = currentTasks;
      wx.setStorageSync('dailyRecord_' + today, dailyRecord);
    }

    // 清理超过7天的旧记录
    this.cleanupOldRecords();

    // 学生名字
    const studentName = wx.getStorageSync('studentName');
    if (!studentName) {
      wx.setStorageSync('studentName', '同学');
    }

  },

  // 清理超过7天的每日记录
  cleanupOldRecords() {
    const keys = wx.getStorageInfoSync().keys || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);

    keys.forEach(key => {
      if (key.startsWith('dailyRecord_')) {
        const dateStr = key.replace('dailyRecord_', '');
        const d = new Date(dateStr);
        if (!isNaN(d.getTime()) && d < cutoff) {
          wx.removeStorageSync(key);
        }
      }
    });
  },

  // 获取指定日期的 key
  getDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  getWeekdayCN() {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return '星期' + days[new Date().getDay()];
  },

  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  globalData: {
    userInfo: null
  }
});
