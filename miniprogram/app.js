App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'YOUR_ENV_ID',
        traceUser: true
      })
    }
  },

  globalData: {
    userInfo: null,
    isAdmin: false,
    cartCount: 0
  },

  getUserInfo: function () {
    const app = this
    return new Promise((resolve, reject) => {
      if (app.globalData.userInfo) {
        resolve(app.globalData.userInfo)
        return
      }
      wx.getUserProfile({
        desc: '用于显示您的昵称和头像',
        success: (res) => {
          app.globalData.userInfo = res.userInfo
          app.doLogin(res.userInfo).then(() => {
            resolve(app.globalData.userInfo)
          }).catch(reject)
        },
        fail: (err) => {
          // Fallback: try silent login
          app.doLogin({ nickName: '用户', avatarUrl: '' }).then(() => {
            resolve(app.globalData.userInfo)
          }).catch(reject)
        }
      })
    })
  },

  doLogin: function (userInfo) {
    const app = this
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        },
        success: (res) => {
          app.globalData.userInfo = userInfo
          app.globalData.isAdmin = res.result.role === 'admin'
          resolve()
        },
        fail: reject
      })
    })
  },

  checkAdmin: function () {
    const app = this
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {},
        success: (res) => {
          app.globalData.isAdmin = res.result.role === 'admin'
          resolve(app.globalData.isAdmin)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }
})