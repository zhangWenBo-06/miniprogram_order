const app = getApp()
const util = require('../../utils/util')

Page({
  data: { orders: [], loading: false, activeTab: 'pending' },

  onShow() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.loadOrders()
  },

  loadOrders() {
    this.setData({ loading: true })
    wx.cloud.callFunction({ name: 'getOrders', data: {} })
      .then(res => {
        const orders = (res.result.orders || []).map(o => ({ ...o, formattedTime: util.formatTime(o.createdAt) }))
        this.setData({ orders, loading: false })
      })
      .catch(() => { this.setData({ loading: false }) })
  },

  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.tab }) },

  changeStatus(e) {
    const { orderId, status } = e.currentTarget.dataset
    const nextStatus = { pending: 'accepted', accepted: 'preparing', preparing: 'done' }[status]
    if (!nextStatus) return
    const statusText = { accepted: '接单', preparing: '开始制作', done: '完成' }
    wx.showModal({
      title: '确认操作',
      content: `确定要「${statusText[nextStatus]}」此订单吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({ name: 'updateOrderStatus', data: { orderId, status: nextStatus } })
            .then(() => { wx.showToast({ title: '更新成功', icon: 'success' }); this.loadOrders() })
            .catch(() => { wx.showToast({ title: '更新失败', icon: 'none' }) })
        }
      }
    })
  }
})