const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { items, note } = event

  if (!items || items.length === 0) {
    return { success: false, error: '订单不能为空' }
  }

  // 创建订单
  const orderRes = await db.collection('orders').add({
    data: {
      _openid: OPENID,
      items,
      note: note || '',
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })

  // 查找管理员并发送订阅消息
  const adminRes = await db.collection('users').where({ role: 'admin' }).get()

  if (adminRes.data.length > 0) {
    const admin = adminRes.data[0]
    // 构造订单摘要
    const itemDesc = items.map(i =>
      `${i.name} x${i.quantity}`
    ).join('、')

    const specsDesc = items[0].specs
      ? Object.entries(items[0].specs).map(([k, v]) => `${v}`).join('·')
      : ''

    try {
      await cloud.openapi.subscribeMessage.send({
        touser: admin._openid,
        templateId: 'ADMIN_ORDER_TEMPLATE_ID', // 替换为实际模板ID
        data: {
          thing1: { value: itemDesc.slice(0, 20) },
          thing2: { value: specsDesc || '无特殊要求' },
          thing3: { value: note || '无备注' }
        },
        page: 'pages/admin-orders/index'
      })
    } catch (err) {
      // 订阅消息发送失败不影响下单流程（比如管理员未授权）
      console.log('订阅消息发送失败:', err.errMsg || err.message)
    }
  }

  return { success: true, orderId: orderRes._id }
}