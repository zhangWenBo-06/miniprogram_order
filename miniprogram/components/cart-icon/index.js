Component({
  properties: {},
  data: {
    count: 0
  },
  lifetimes: {
    attached() {
      this.updateCount()
    },
    ready() {
      // Poll for changes (simple approach since we use globalData)
      this._timer = setInterval(() => {
        this.updateCount()
      }, 500)
    },
    detached() {
      if (this._timer) clearInterval(this._timer)
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