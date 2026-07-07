const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  // 查找用户
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()

  if (userRes.data.length > 0) {
    const user = userRes.data[0]
    // 如果传了新的昵称/头像则更新
    if (event.nickName || event.avatarUrl) {
      await db.collection('users').doc(user._id).update({
        data: {
          nickName: event.nickName || user.nickName,
          avatarUrl: event.avatarUrl || user.avatarUrl
        }
      })
    }
    return { role: user.role, openid: OPENID }
  }

  // 新用户：创建记录
  await db.collection('users').add({
    data: {
      _openid: OPENID,
      nickName: event.nickName || '用户',
      avatarUrl: event.avatarUrl || '',
      role: 'user',
      createdAt: db.serverDate()
    }
  })

  return { role: 'user', openid: OPENID }
}