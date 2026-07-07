Page({
  data: {
    categories: [
      { key: 'drink', label: '🥤 奶茶' },
      { key: 'snack', label: '🍿 零食' },
      { key: 'meal', label: '🍱 餐食' }
    ],
    selectedCategory: 'drink',
    name: '',
    reason: '',
    submitting: false
  },

  onCategoryChange(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.category })
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onReasonInput(e) { this.setData({ reason: e.detail.value }) },

  submit() {
    const { selectedCategory, name, reason } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    wx.cloud.callFunction({
      name: 'submitSuggestion',
      data: { name: name.trim(), category: selectedCategory, reason: reason.trim() }
    }).then(() => {
      this.setData({ name: '', reason: '', submitting: false })
      wx.showModal({
        title: '建议已提交',
        content: '收到你的建议啦，等我的好消息~',
        showCancel: false,
        success: () => { wx.navigateBack() }
      })
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    })
  }
})