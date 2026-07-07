Page({
  data: { suggestions: [], loading: false },

  onShow() { this.loadSuggestions() },

  loadSuggestions() {
    this.setData({ loading: true })
    wx.cloud.callFunction({ name: 'getSuggestions', data: {} })
      .then(res => { this.setData({ suggestions: res.result.suggestions || [], loading: false }) })
      .catch(() => { this.setData({ loading: false }) })
  },

  handleSuggestion(e) {
    const { id, action } = e.currentTarget.dataset
    const actionText = action === 'approved' ? '通过' : '拒绝'
    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}此建议吗？${action === 'approved' ? '将自动加入菜单。' : ''}`,
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({ name: 'handleSuggestion', data: { suggestionId: id, action } })
            .then(() => { wx.showToast({ title: `已${actionText}`, icon: 'success' }); this.loadSuggestions() })
            .catch(() => { wx.showToast({ title: '操作失败', icon: 'none' }) })
        }
      }
    })
  }
})