// app.js
App({
  _syncTimer: null,

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({ env: 'cloud1-2g3wr08heebc2fa4', traceUser: true });
    }
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

    // 启动时自动从云端同步
    this.cloudSync();
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

  // ─── 云同步 ───

  // 收集本地数据
  _collectLocalData() {
    const tasks = wx.getStorageSync('tasks') || [];
    const studentName = wx.getStorageSync('studentName') || '同学';
    const updatedAt = wx.getStorageSync('dataUpdatedAt') || 0;
    const dailyRecords = {};
    try {
      const keys = wx.getStorageInfoSync().keys || [];
      keys.forEach(k => {
        if (k.indexOf('dailyRecord_') === 0) {
          dailyRecords[k] = wx.getStorageSync(k);
        }
      });
    } catch (e) {}
    return { tasks, studentName, dailyRecords, updatedAt };
  },

  // 合并云端数据到本地（不丢失任何一方的每日记录）
  _applyCloudData(cloudData, localData) {
    if (!cloudData) return;
    if (cloudData.tasks && cloudData.tasks.length > 0) wx.setStorageSync('tasks', cloudData.tasks);
    if (cloudData.studentName !== undefined && cloudData.studentName !== null) {
      wx.setStorageSync('studentName', cloudData.studentName || '同学');
    }

    // 合并每日记录：云端 + 本地取并集，同一天取完成数更多的版本
    const mergedKeys = new Set();
    if (cloudData.dailyRecords) Object.keys(cloudData.dailyRecords).forEach(k => mergedKeys.add(k));
    if (localData && localData.dailyRecords) Object.keys(localData.dailyRecords).forEach(k => mergedKeys.add(k));

    mergedKeys.forEach(key => {
      const cloudRec = cloudData.dailyRecords && cloudData.dailyRecords[key];
      const localRec = localData && localData.dailyRecords && localData.dailyRecords[key];
      if (cloudRec && localRec) {
        // 两端都有：取完成项更多的版本
        const cloudDone = (cloudRec.completedIds || []).length + (cloudRec.subCompletedIds || []).length;
        const localDone = (localRec.completedIds || []).length + (localRec.subCompletedIds || []).length;
        wx.setStorageSync(key, localDone >= cloudDone ? localRec : cloudRec);
      } else {
        wx.setStorageSync(key, cloudRec || localRec);
      }
    });

    // 持久化云端时间戳
    if (cloudData.updatedAt) wx.setStorageSync('dataUpdatedAt', cloudData.updatedAt);
  },

  // 云端数据下载后通知当前页面刷新
  _notifyPageReload() {
    var pages = getCurrentPages();
    if (pages.length > 0) {
      var curPage = pages[pages.length - 1];
      if (curPage && typeof curPage.loadData === 'function') {
        curPage.loadData();
      }
    }
  },

  // 启动同步：比较时间戳，合并数据
  cloudSync(callback) {
    if (!wx.cloud) { callback && callback('unsupported'); return; }
    const db = wx.cloud.database();
    const col = db.collection('user_data');
    const localData = this._collectLocalData();
    const that = this;

    col.where({ _openid: '{openid}' }).get({
      success(res) {
        if (res.data && res.data.length > 0) {
          const cloud = res.data[0];
          if (cloud.updatedAt && cloud.updatedAt > localData.updatedAt) {
            // 云端更新 → 合并下载（保留本地独有的每日记录）
            that._applyCloudData(cloud, localData);
            that._notifyPageReload();
            callback && callback('downloaded');
          } else {
            // 本地更新 → 上传
            const uploadData = Object.assign({}, localData, { updatedAt: Date.now() });
            col.doc(cloud._id).update({ data: uploadData, success() {
              wx.setStorageSync('dataUpdatedAt', uploadData.updatedAt);
              callback && callback('uploaded');
            }, fail() { callback && callback('error'); } });
          }
        } else {
          // 云端无数据 → 新建
          var uploadData = Object.assign({}, localData, { updatedAt: Date.now() });
          col.add({ data: uploadData, success() {
            wx.setStorageSync('dataUpdatedAt', uploadData.updatedAt);
            callback && callback('uploaded');
          }, fail() { callback && callback('error'); } });
        }
      },
      fail() { callback && callback('error'); }
    });
  },

  // 数据变更时延迟 3 秒上传（防抖）
  notifyDataChange() {
    if (!wx.cloud) return;
    // 标记本地数据变更时间
    wx.setStorageSync('dataUpdatedAt', Date.now());
    if (this._syncTimer) clearTimeout(this._syncTimer);
    const that = this;
    this._syncTimer = setTimeout(function () {
      that.cloudSync();
    }, 3000);
  },

  globalData: {
    userInfo: null,
    version: 'v2.2.0'
  }
});
