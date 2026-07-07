Component({
  properties: {
    status: {
      type: String,
      value: 'pending'
    }
  },

  data: {
    statusText: '',
    bgColor: '#eee'
  },

  lifetimes: {
    attached() {
      this.updateStatus()
    }
  },

  observers: {
    'status'() {
      this.updateStatus()
    }
  },

  methods: {
    updateStatus() {
      const map = {
        pending: { text: '待处理', color: '#fff3e0', textColor: '#ff9800' },
        accepted: { text: '已接单', color: '#e3f2fd', textColor: '#2196f3' },
        preparing: { text: '制作中', color: '#f3e5f5', textColor: '#9c27b0' },
        done: { text: '已完成', color: '#e8f5e9', textColor: '#4caf50' }
      }
      const info = map[this.data.status] || map.pending
      this.setData({
        statusText: info.text,
        bgColor: info.color,
        textColor: info.textColor
      })
    }
  }
})