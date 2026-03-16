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
    progress: 0,
    totalSubTasks: 0,
    completedSubTasks: 0,
    greeting: '',
    showExportModal: false,
    exporting: false,
    exportSuccess: false,
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
    const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const todayDate = `${d.getFullYear()}年${months[d.getMonth()]}月${d.getDate()}日`;
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

    this.setData({
      tasks,
      studentName,
      todayDate,
      weekday,
      completedIds: record.completedIds,
      subCompletedIds: record.subCompletedIds,
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
      wx.vibrateShort({ type: 'light' });
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

    this.setData({ subCompletedIds, completedIds, progress, completedSubTasks: completedSub });
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
            progress: 0,
            completedSubTasks: 0,
          });
          wx.showToast({ title: '已重置', icon: 'success' });
        }
      }
    });
  },

  // 导出PDF（通过生成分享图）
  showExport() {
    this.setData({ showExportModal: true });
  },

  closeExport() {
    this.setData({ showExportModal: false, exportSuccess: false });
  },

  // 导出为PDF（小程序中通过Canvas生成图片再导出）
  exportPDF() {
    this.setData({ exporting: true });

    const tasks = this.data.tasks;
    const { subCompletedIds, studentName, todayDate, weekday, progress } = this.data;

    // 使用Canvas绘制任务清单图片
    const query = wx.createSelectorQuery();
    query.select('#exportCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0] || !res[0].node) {
        // 降级方案：直接生成文件内容并提示保存
        this.generateTextExport();
        return;
      }

      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const W = 750, H = this.calcCanvasHeight();
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      this.drawCanvas(ctx, W, H, tasks, subCompletedIds, studentName, todayDate, weekday, progress);

      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvas,
          success: (r) => {
            wx.saveImageToPhotosAlbum({
              filePath: r.tempFilePath,
              success: () => {
                this.setData({ exporting: false, exportSuccess: true });
              },
              fail: () => {
                // 无相册权限，尝试分享
                this.setData({ exporting: false });
                wx.showActionSheet({
                  itemList: ['保存到相册', '分享给朋友'],
                  success: (action) => {
                    if (action.tapIndex === 0) {
                      wx.openSetting();
                    }
                  }
                });
              }
            });
          },
          fail: () => {
            this.generateTextExport();
          }
        }, this);
      }, 500);
    });
  },

  calcCanvasHeight() {
    const tasks = this.data.tasks;
    let h = 380; // header
    tasks.forEach(t => {
      h += 120;
      if (t.subTasks) h += t.subTasks.length * 70;
      h += 20;
    });
    h += 100; // footer
    return h;
  },

  drawCanvas(ctx, W, H, tasks, subCompletedIds, studentName, todayDate, weekday, progress) {
    // 兼容不支持 roundRect 的环境
    const roundRectPath = (ctx, x, y, w, h, r) => {
      if (typeof r === 'number') r = [r, r, r, r];
      const [tl, tr, br, bl] = r;
      ctx.moveTo(x + tl, y);
      ctx.lineTo(x + w - tr, y);
      ctx.arcTo(x + w, y, x + w, y + tr, tr);
      ctx.lineTo(x + w, y + h - br);
      ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
      ctx.lineTo(x + bl, y + h);
      ctx.arcTo(x, y + h, x, y + h - bl, bl);
      ctx.lineTo(x, y + tl);
      ctx.arcTo(x, y, x + tl, y, tl);
      ctx.closePath();
    };
    const colors = { hw: '#FF7F7F', study: '#B57BEE', exercise: '#FFAC6A', default: '#6EC6F5' };

    // 背景
    ctx.fillStyle = '#FFF8EC';
    ctx.fillRect(0, 0, W, H);

    // 顶部渐变头部
    const grad = ctx.createLinearGradient(0, 0, W, 200);
    grad.addColorStop(0, '#6EC6F5');
    grad.addColorStop(1, '#A8E6CF');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 220);
    ctx.quadraticCurveTo(W / 2, 280, 0, 220);
    ctx.closePath();
    ctx.fill();

    // 标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px PingFang SC';
    ctx.textAlign = 'center';
    ctx.fillText('📚 每日任务清单', W / 2, 70);

    ctx.font = '28px PingFang SC';
    ctx.fillText(`${studentName} · ${todayDate} ${weekday}`, W / 2, 120);

    // 进度
    ctx.font = 'bold 36px PingFang SC';
    ctx.fillText(`完成进度 ${progress}%`, W / 2, 170);

    // 进度条背景
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    roundRectPath(ctx,60, 185, W - 120, 20, 10);
    ctx.fill();

    // 进度条
    ctx.fillStyle = '#FFD95A';
    ctx.beginPath();
    roundRectPath(ctx,60, 185, (W - 120) * (progress / 100), 20, 10);
    ctx.fill();

    // 任务列表
    let y = 300;
    tasks.forEach((task) => {
      // 任务卡片背景
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.06)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      roundRectPath(ctx,30, y, W - 60, 100 + (task.subTasks ? task.subTasks.length * 64 : 0), 20);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // 左色条
      ctx.fillStyle = task.color || '#6EC6F5';
      ctx.beginPath();
      roundRectPath(ctx,30, y, 10, 100 + (task.subTasks ? task.subTasks.length * 64 : 0), [20, 0, 0, 20]);
      ctx.fill();

      // 任务名
      ctx.fillStyle = '#2D2D2D';
      ctx.font = 'bold 32px PingFang SC';
      ctx.textAlign = 'left';
      ctx.fillText(`${task.icon} ${task.name}`, 60, y + 52);

      // 时间
      ctx.fillStyle = '#999';
      ctx.font = '24px PingFang SC';
      ctx.fillText(`预计 ${task.estimatedTime} 分钟`, 60, y + 84);

      // 子任务
      let sy = y + 108;
      if (task.subTasks) {
        task.subTasks.forEach((sub) => {
          const done = subCompletedIds.includes(sub.id);
          ctx.fillStyle = done ? '#5CC97A' : '#DDDDDD';
          ctx.beginPath();
          ctx.arc(76, sy + 12, 12, 0, Math.PI * 2);
          ctx.fill();

          if (done) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px PingFang SC';
            ctx.textAlign = 'center';
            ctx.fillText('✓', 76, sy + 18);
            ctx.textAlign = 'left';
          }

          ctx.fillStyle = done ? '#AAAAAA' : '#444444';
          ctx.font = done ? '26px PingFang SC' : '26px PingFang SC';
          ctx.fillText(sub.name, 104, sy + 18);

          ctx.fillStyle = '#BBBBBB';
          ctx.font = '22px PingFang SC';
          ctx.textAlign = 'right';
          ctx.fillText(`${sub.estimatedTime}min`, W - 50, sy + 18);
          ctx.textAlign = 'left';

          sy += 64;
        });
      }

      y = sy + 24;
    });

    // 底部
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '22px PingFang SC';
    ctx.textAlign = 'center';
    ctx.fillText('由每日任务清单小程序生成', W / 2, y + 30);
  },

  generateTextExport() {
    const { tasks, subCompletedIds, studentName, todayDate, weekday, progress } = this.data;
    this.setData({ exporting: false });
    wx.showModal({
      title: '导出说明',
      content: `已为您准备好任务清单！\n${studentName}的${todayDate}任务\n完成进度：${progress}%\n\n微信小程序限制，请截图保存任务清单。`,
      showCancel: false,
      confirmText: '我知道了'
    });
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
          wx.showToast({ title: '已删除', icon: 'none' });
        }
      }
    });
  },

  // 获取任务颜色样式（用于WXSS不支持动态颜色的情况）
  getTaskStyle(task) {
    return `border-left: 8rpx solid ${task.color}`;
  },
});
