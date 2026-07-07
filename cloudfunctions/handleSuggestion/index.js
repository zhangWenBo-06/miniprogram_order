const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { suggestionId, action } = event
  if (!suggestionId || !['approved', 'rejected'].includes(action)) {
    return { success: false, error: '参数不完整' }
  }

  const sugRes = await db.collection('suggestions').doc(suggestionId).get()
  if (!sugRes.data) {
    return { success: false, error: '建议不存在' }
  }

  // 更新建议状态
  await db.collection('suggestions').doc(suggestionId).update({
    data: { status: action }
  })

  // 如果通过，自动创建菜单项
  if (action === 'approved') {
    const sug = sugRes.data
    await db.collection('menus').add({
      data: {
        name: sug.name,
        category: sug.category,
        image: '',
        price: 0,
        specs: [],
        available: true,
        createdAt: db.serverDate()
      }
    })
  }

  return { success: true }
}