# 小程序配置指南

在 WeChat DevTools 中打开本项目后，按以下步骤完成配置。

## 1. 替换 AppID

打开 `miniprogram/project.config.json`，将 `YOUR_APPID_HERE` 替换为你的真实 AppID：

```json
"appid": "wx1234567890abcdef"
```

## 2. 配置云开发环境 ID

打开 `miniprogram/app.js`，将 `YOUR_ENV_ID` 替换为你的云开发环境 ID（在微信开发者工具 → 云开发控制台 → 设置中可获取）：

```javascript
env: 'your-env-id-xxxxx'
```

## 3. 上传云函数

在 WeChat DevTools 中，右键点击 `cloudfunctions/` 下的每个文件夹，选择 **"上传并部署：云端安装依赖"**。需逐一上传以下 11 个云函数：

1. `login`
2. `getMenus`
3. `addMenu`
4. `updateMenu`
5. `deleteMenu`
6. `submitOrder`
7. `getOrders`
8. `updateOrderStatus`
9. `submitSuggestion`
10. `getSuggestions`
11. `handleSuggestion`

## 4. 创建数据库集合

在微信开发者工具 → 云开发控制台 → 数据库，创建以下 4 个集合并设置权限：

| 集合名 | 读权限 | 写权限 |
|--------|--------|--------|
| `users` | 所有用户 | 仅创建者 |
| `menus` | 所有用户 | 所有用户 |
| `orders` | 所有用户 | 所有用户 |
| `suggestions` | 所有用户 | 仅创建者 |

## 5. 设置管理员

在 `users` 集合中，将你本人的记录中 `role` 字段值设为 `admin`（登录一次小程序后会自动创建 users 记录，然后手动修改 role 字段）。

```json
{
  "_openid": "你的openid",
  "role": "admin"
}
```

## 6. 申请并替换订阅消息模板 ID

在微信公众平台 → 功能 → 订阅消息，申请以下两类模板：

**模板一：新订单通知（通知管理员）**
- 字段：`thing1`（商品名称）、`thing2`（规格）、`thing3`（备注）
- 获得模板 ID 后，替换以下文件中的 `ADMIN_ORDER_TEMPLATE_ID`：
  - `cloudfunctions/submitOrder/index.js` 第 42 行
  - `miniprogram/pages/index/index.js` 第 85 行

**模板二：订单状态变更通知（通知用户）**
- 字段：`thing1`（订单商品）、`phrase2`（订单状态）、`thing3`（提示）
- 获得模板 ID 后，替换以下文件中的 `USER_STATUS_TEMPLATE_ID`：
  - `cloudfunctions/updateOrderStatus/index.js` 第 49 行
  - `miniprogram/pages/cart/index.js` 第 74 行
  - `miniprogram/pages/orders/index.js` 第 60 行

## 7. 替换 Tab Bar 图标（可选）

当前使用的 1x1 像素纯色占位图标（`miniprogram/images/` 目录下的 8 个 PNG 文件）。建议替换为正式的 40x40 像素图标：

- `tab-home.png` / `tab-home-active.png`（首页）
- `tab-menu.png` / `tab-menu-active.png`（菜单）
- `tab-cart.png` / `tab-cart-active.png`（购物车）
- `tab-mine.png` / `tab-mine-active.png`（我的）

inactive 状态建议使用 #999999 灰色，active 状态建议使用 #ff6b81 粉色（与 navigationBar 颜色一致）。

## 8. 验证完整流程

1. 在 WeChat DevTools 中打开项目
2. 依次点击 4 个 tabBar 标签页，确认页面正常渲染
3. 通过管理面板（首页管理入口 → 菜单管理）添加菜品
4. 浏览菜单 → 点击菜品 → 选择规格 → 加入购物车
5. 进入购物车 → 提交订单
6. 确认订单出现在管理订单页面
7. 更改订单状态：待处理 → 已接单 → 制作中 → 已完成
8. 确认用户端订单页面状态同步更新
9. 提交建议菜品 → 在管理建议页面审核通过 → 确认菜品自动加入菜单