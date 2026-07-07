Component({
  properties: {},
  data: {
    count: 0
  },
  lifetimes: {
    attached() {
      this.updateCount()
    }
  },
  pageLifetimes: {
    show() {
      this.updateCount()
    }
  },
  methods: {
    updateCount() {
      const app = getApp()
      this.setData({ count: app.globalData.cartCount })
    },
    onTap() {
      wx.switchTab({ url: '/pages/cart/index' })
    }
  }
})