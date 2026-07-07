const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const STATUS_MAP = {
  pending: '待处理',
  accepted: '已接单',
  preparing: '制作中',
  done: '已完成'
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { orderId, status } = event
  if (!orderId || !status) {
    return { success: false, error: '参数不完整' }
  }

  const validStatuses = ['pending', 'accepted', 'preparing', 'done']
  if (!validStatuses.includes(status)) {
    return { success: false, error: '无效的状态' }
  }

  await db.collection('orders').doc(orderId).update({
    data: {
      status,
      updatedAt: db.serverDate()
    }
  })

  // 发送订阅消息给下单用户
  const orderRes = await db.collection('orders').doc(orderId).get()
  if (!orderRes.data) {
    return { success: true }
  }

  const order = orderRes.data
  const itemName = order.items[0] ? order.items[0].name : '商品'

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: order._openid,
      templateId: 'USER_STATUS_TEMPLATE_ID', // 替换为实际模板ID
      data: {
        thing1: { value: itemName.slice(0, 20) },
        phrase2: { value: STATUS_MAP[status] },
        thing3: { value: '点击查看订单详情' }
      },
      page: 'pages/orders/index'
    })
  } catch (err) {
    console.log('推送订阅消息失败:', err.errMsg || err.message)
  }

  return { success: true }
}