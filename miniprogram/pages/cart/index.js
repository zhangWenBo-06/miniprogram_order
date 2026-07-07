const util = require('../../utils/util')

Page({
  data: {
    cartItems: [],
    totalCount: 0,
    note: '',
    submitting: false
  },

  onShow() {
    this.loadCart()
  },

  loadCart() {
    const cart = util.getCart()
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    this.setData({ cartItems: cart, totalCount })
  },

  onQuantityChange(e) {
    const { index, action } = e.currentTarget.dataset
    const cart = util.getCart()
    if (action === 'minus') {
      if (cart[index].quantity > 1) { cart[index].quantity -= 1 }
      else { cart.splice(index, 1) }
    } else if (action === 'plus') {
      if (cart[index].quantity < 99) { cart[index].quantity += 1 }
    }
    util.saveCart(cart)
    this.loadCart()
  },

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '确定要移除此菜品吗？',
      success: (res) => {
        if (res.confirm) {
          const cart = util.getCart()
          cart.splice(index, 1)
          util.saveCart(cart)
          this.loadCart()
        }
      }
    })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  submitOrder() {
    if (this.data.cartItems.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    wx.cloud.callFunction({
      name: 'submitOrder',
      data: {
        items: this.data.cartItems.map(item => ({
          menuId: item.menuId, name: item.name,
          quantity: item.quantity, specs: item.specs, remark: item.remark
        })),
        note: this.data.note
      }
    }).then(() => {
      util.clearCart()
      this.loadCart()
      this.setData({ note: '', submitting: false })
      wx.requestSubscribeMessage({
        tmplIds: ['USER_STATUS_TEMPLATE_ID'],
        success: () => {}, fail: () => {},
        complete: () => {
          wx.showModal({
            title: '下单成功',
            content: '你的专属订单已提交，等着享用吧~',
            showCancel: false,
            success: () => { wx.switchTab({ url: '/pages/index/index' }) }
          })
        }
      })
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '下单失败，请重试', icon: 'none' })
    })
  }
})