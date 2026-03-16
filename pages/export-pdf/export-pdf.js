// pages/export-pdf/export-pdf.js
// 纯小程序实现：手动构建 PDF 二进制，写入本地文件系统，调用 wx.openDocument 打开
// PDF 使用 PDF 1.4 规范手写构建，通过 CIDFont (STSong-Light) + UniGB-UCS2-H 支持中文显示

const app = getApp();

Page({
  data: {
    exportData: null,
    status: 'ready', // ready | building | done | error
    statusText: '准备就绪',
    progress: 0,
    filePath: '',
    studentName: '',
    dateStr: '',
    pct: 0,
    totalSub: 0,
    doneSub: 0,
    taskList: [],      // 带 selected 字段的任务列表
    selectedCount: 0,  // 已选任务数
    allSelected: true,  // 是否全选
  },

  onLoad() {
    const exportData = wx.getStorageSync('pendingExportData') || null;
    if (!exportData) {
      const tasks = wx.getStorageSync('tasks') || [];
      const studentName = wx.getStorageSync('studentName') || '同学';
      const today = app.getTodayKey();
      const record = wx.getStorageSync('dailyRecord_' + today) || { subCompletedIds: [] };
      const d = new Date();
      const months = ['一','二','三','四','五','六','七','八','九','十','十一','十二'];
      const dateStr = `${d.getFullYear()}年${months[d.getMonth()]}月${d.getDate()}日`;
      const days = ['日','一','二','三','四','五','六'];
      const weekday = '星期' + days[d.getDay()];
      this._exportData = { studentName, dateStr, weekday, tasks, completedSubIds: record.subCompletedIds || [] };
    } else {
      this._exportData = exportData;
      wx.removeStorageSync('pendingExportData');
    }

    // 构建带 selected 字段的任务列表（默认全选）
    const { studentName, dateStr, tasks, completedSubIds } = this._exportData;
    const taskList = (tasks || []).map((t, i) => ({ ...t, _index: i, selected: true }));

    this.setData({
      exportData: this._exportData,
      studentName,
      dateStr,
      taskList,
      selectedCount: taskList.length,
      allSelected: true,
    });
    this._updateStats();
  },

  // 切换单个任务的选中状态
  toggleTask(e) {
    const idx = e.currentTarget.dataset.index;
    const key = `taskList[${idx}].selected`;
    const newVal = !this.data.taskList[idx].selected;
    const selectedCount = this.data.selectedCount + (newVal ? 1 : -1);
    this.setData({
      [key]: newVal,
      selectedCount,
      allSelected: selectedCount === this.data.taskList.length,
    });
    this._updateStats();
  },

  // 全选 / 取消全选
  toggleAll() {
    const allSelected = !this.data.allSelected;
    const taskList = this.data.taskList.map(t => ({ ...t, selected: allSelected }));
    this.setData({
      taskList,
      allSelected,
      selectedCount: allSelected ? taskList.length : 0,
    });
    this._updateStats();
  },

  // 根据选中任务重新计算统计
  _updateStats() {
    const { taskList } = this.data;
    const completedSubIds = this._exportData.completedSubIds || [];
    let totalSub = 0, doneSub = 0;
    taskList.filter(t => t.selected).forEach(t => {
      (t.subTasks || []).forEach(s => {
        totalSub++;
        if (completedSubIds.includes(s.id)) doneSub++;
      });
    });
    const pct = totalSub > 0 ? Math.round(doneSub / totalSub * 100) : 0;
    this.setData({ pct, totalSub, doneSub });
  },

  goBack() {
    wx.navigateBack();
  },

  // ─── 核心导出逻辑 ───
  startExport() {
    if (this.data.selectedCount === 0) {
      wx.showToast({ title: '请至少选择一个任务', icon: 'none' });
      return;
    }
    this.setData({ status: 'building', statusText: '正在生成 PDF...', progress: 10 });
    setTimeout(() => this._buildAndOpenPDF(), 100);
  },

  _buildAndOpenPDF() {
    try {
      // 只导出选中的任务
      const selectedTasks = this.data.taskList.filter(t => t.selected);
      const data = { ...this._exportData, tasks: selectedTasks };
      const pdfBytes = this._buildPDF(data);

      this.setData({ progress: 70, statusText: '写入文件...' });

      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const { studentName, dateStr } = data;
      const safeName = (studentName || 'student').replace(/[^\w\u4e00-\u9fa5]/g, '');
      const safeDate = (dateStr || 'today').replace(/[年月日]/g, '-').replace(/-$/, '');
      const filePath = `${wx.env.USER_DATA_PATH}/TaskList_${safeName}_${safeDate}.pdf`;

      fs.writeFile({
        filePath,
        data: pdfBytes,
        encoding: 'binary',
        success: () => {
          this.setData({ progress: 90, statusText: '即将打开...' });
          this._openPDF(filePath);
        },
        fail: (err) => {
          console.error('writeFile fail', err);
          this.setData({ status: 'error', statusText: '文件写入失败：' + (err.errMsg || '') });
        }
      });
    } catch (err) {
      console.error('buildPDF error', err);
      this.setData({ status: 'error', statusText: '生成失败：' + err.message });
    }
  },

  _openPDF(filePath) {
    wx.openDocument({
      filePath,
      fileType: 'pdf',
      showMenu: true, // 显示右上角菜单（可转发、保存）
      success: () => {
        this.setData({ status: 'done', progress: 100, statusText: '已打开 PDF！', filePath });
      },
      fail: (err) => {
        console.error('openDocument fail', err);
        // openDocument 失败时，尝试通过分享文件
        this._shareFile(filePath);
      }
    });
  },

  _shareFile(filePath) {
    // 保存到用户文件（持久化）
    const fs = wx.getFileSystemManager();
    fs.saveFile({
      tempFilePath: filePath,
      success: (res) => {
        this.setData({ status: 'done', progress: 100, statusText: 'PDF已保存，可在「我的文件」查看', filePath: res.savedFilePath });
        wx.showModal({
          title: '✅ PDF 已生成',
          content: '文件已保存到微信「我的文件」，可在微信底部菜单 → 我 → 收藏/文件 中查看',
          showCancel: false,
          confirmText: '好的',
        });
      },
      fail: () => {
        this.setData({ status: 'done', progress: 100, statusText: 'PDF已生成，请截图或分享' });
      }
    });
  },

  // 通过 wx.shareFileMessage 转发文件
  shareFile() {
    const { filePath } = this.data;
    if (!filePath) return;
    wx.shareFileMessage({
      filePath,
      success: () => wx.showToast({ title: '分享成功', icon: 'success' }),
      fail: () => wx.showToast({ title: '分享失败', icon: 'none' }),
    });
  },

  // ─── PDF 二进制构建 ───
  // 手动构建符合 PDF 1.4 规范的 PDF，使用 CIDFont (STSong-Light) 支持中文显示
  // 文本使用 UTF-16BE 编码的十六进制字符串
  _buildPDF(exportData) {
    const { studentName, dateStr, weekday, tasks, completedSubIds } = exportData;
    const subDone = completedSubIds || [];

    // 计算统计
    let totalSub = 0, doneSub = 0;
    (tasks || []).forEach(t => {
      (t.subTasks || []).forEach(s => {
        totalSub++;
        if (subDone.includes(s.id)) doneSub++;
      });
    });
    const pct = totalSub > 0 ? Math.round(doneSub / totalSub * 100) : 0;

    // 将字符串编码为 UTF-16BE 十六进制（PDF 用 <hex> 语法显示中文）
    const toHex = (str) => {
      if (!str) return 'FEFF';
      let hex = 'FEFF'; // UTF-16BE BOM
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        hex += code.toString(16).toUpperCase().padStart(4, '0');
      }
      return hex;
    };

    // 输出一行文本的辅助函数（每次都用独立 BT/ET 块，避免 Td 相对偏移问题）
    const textLine = (x, y, font, size, r, g, b, str, bold) => {
      let s = 'BT\n';
      if (bold) {
        s += `2 Tr ${bold} w\n`; // fill+stroke 模拟粗体
        s += `${r} ${g} ${b} rg ${r} ${g} ${b} RG\n`;
      } else {
        s += `${r} ${g} ${b} rg\n`;
      }
      s += `/${font} ${size} Tf\n`;
      s += `${x} ${y} Td\n`;
      s += `<${toHex(str)}> Tj\n`;
      if (bold) s += `0 Tr\n`;
      s += `ET\n`;
      return s;
    };

    // A4: 595 x 842 points
    const W = 595, H = 842;
    const ML = 50, MR = 50, MT = 50;

    let y = H - MT;
    let gfx = '';

    // ── 顶部色块 ──
    gfx += `0.431 0.776 0.961 rg\n`; // #6EC6F5
    gfx += `${ML} ${y - 80} ${W - ML - MR} 80 re f\n`;
    gfx += `0.659 0.902 0.808 rg\n`; // #A8E6CF
    gfx += `${W - MR - 60} ${y - 20} 55 20 re f\n`;

    // ── 标题文字 ──
    gfx += textLine(ML + 10, y - 30, 'F1', 20, 1, 1, 1, '每日任务清单', 0.8);
    gfx += textLine(ML + 10, y - 46, 'F1', 11, 1, 1, 1, studentName || '');
    gfx += textLine(ML + 10, y - 60, 'F1', 10, 1, 1, 1, (dateStr || '') + '  ' + (weekday || ''));
    gfx += textLine(ML + 10, y - 74, 'F1', 12, 1, 1, 1, `完成度: ${pct}%  ${doneSub}/${totalSub} 个子任务`, 0.5);

    // 进度条
    const barX = ML + 200, barY_pdf = y - 74, barW = W - ML - MR - 210;
    gfx += `0.8 0.8 0.8 rg\n`;
    gfx += `${barX} ${barY_pdf - 4} ${barW} 10 re f\n`;
    gfx += `1.0 0.851 0.353 rg\n`; // #FFD95A
    gfx += `${barX} ${barY_pdf - 4} ${Math.round(barW * pct / 100)} 10 re f\n`;

    y -= 94;

    // ── 任务卡片 ──
    const colorMap = {
      '#FF7F7F': '1.0 0.498 0.498',
      '#6EC6F5': '0.431 0.776 0.961',
      '#5CC97A': '0.361 0.788 0.478',
      '#B57BEE': '0.710 0.482 0.933',
      '#FFAC6A': '1.0 0.675 0.416',
      '#FFD95A': '1.0 0.851 0.353',
      '#FF6BAE': '1.0 0.420 0.682',
      '#4ECDC4': '0.306 0.804 0.769',
    };

    const PAGE_BOTTOM = 60;

    for (const task of (tasks || [])) {
      const subCount = (task.subTasks || []).length;
      const cardH = 36 + subCount * 18 + 8;

      if (y - cardH < PAGE_BOTTOM) break;

      const cardY = y - cardH;

      // 卡片白色背景
      gfx += `0.97 0.97 0.97 rg\n`;
      gfx += `${ML} ${cardY} ${W - ML - MR} ${cardH} re f\n`;

      // 左侧彩色竖条
      const colorStr = colorMap[task.color] || '0.431 0.776 0.961';
      gfx += `${colorStr} rg\n`;
      gfx += `${ML} ${cardY} 4 ${cardH} re f\n`;

      // 任务名称（粗体）
      const taskDone = (task.subTasks || []).length > 0 && (task.subTasks || []).every(s => subDone.includes(s.id));
      gfx += textLine(ML + 10, y - 16, 'F1', 11, 0.18, 0.18, 0.18, task.name || '', 0.4);

      if (taskDone) {
        gfx += textLine(W - MR - 55, y - 16, 'F1', 9, 0.361, 0.788, 0.478, '已完成');
      }

      gfx += textLine(ML + 10, y - 28, 'F1', 8, 0.66, 0.66, 0.66, '约' + (task.estimatedTime || 0) + '分钟');

      // 分割线
      gfx += `0.9 0.9 0.9 RG\n`;
      gfx += `0.5 w\n`;
      gfx += `${ML + 6} ${y - 32} m ${W - MR - 6} ${y - 32} l S\n`;

      // 子任务
      let sy = y - 44;
      for (const sub of (task.subTasks || [])) {
        const done = subDone.includes(sub.id);

        if (done) {
          gfx += `${colorStr} rg\n`;
          gfx += `${ML + 14} ${sy - 3} 7 7 re f\n`;
          gfx += `1 1 1 RG\n`;
          gfx += `1 w\n`;
          gfx += `${ML + 15.5} ${sy} m ${ML + 17} ${sy + 2} l ${ML + 20} ${sy - 2} l S\n`;
        } else {
          gfx += `0.8 0.8 0.8 RG\n`;
          gfx += `0.5 w\n`;
          gfx += `${ML + 14} ${sy - 3} 7 7 re S\n`;
        }

        // 子任务名
        const subColor = done ? [0.66, 0.66, 0.66] : [0.33, 0.33, 0.33];
        gfx += textLine(ML + 25, sy, 'F1', 9, subColor[0], subColor[1], subColor[2], sub.name || '');
        gfx += textLine(W - MR - 40, sy, 'F1', 8, 0.75, 0.75, 0.75, (sub.estimatedTime || 0) + '分钟');

        sy -= 18;
      }

      y = cardY - 6;
    }

    // 页脚
    gfx += textLine(W / 2 - 80, 30, 'F1', 8, 0.75, 0.75, 0.75, '每日任务清单  |  ' + (dateStr || ''));

    // ── 构建 PDF 对象 ──
    const objects = [];
    let objId = 1;

    const addObj = (content) => {
      objects.push({ id: objId++, content });
      return objId - 1;
    };

    // obj 1: Catalog
    addObj(`<< /Type /Catalog /Pages 2 0 R >>`);

    // obj 2: Pages
    addObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);

    // obj 3: Page（引用 F1 字体）
    addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`);

    // obj 4: Content stream
    const streamBytes = gfx;
    addObj(`<< /Length ${streamBytes.length} >>\nstream\n${streamBytes}\nendstream`);

    // obj 5: Type0 复合字体（支持中文），使用 STSong-Light + UniGB-UCS2-H CMap
    addObj(`<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [6 0 R] >>`);

    // obj 6: CIDFont 子字体
    addObj(`<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> >>`);

    // ── 组装 PDF 文件 ──
    let pdf = '%PDF-1.4\n';
    const offsets = [];

    objects.forEach(obj => {
      offsets.push(pdf.length);
      pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += 'xref\n';
    pdf += `0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.forEach(off => {
      pdf += String(off).padStart(10, '0') + ' 00000 n \n';
    });

    pdf += 'trailer\n';
    pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefOffset}\n`;
    pdf += '%%EOF';

    return pdf;
  },
});
