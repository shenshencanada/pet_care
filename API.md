# 预约 RESTful API 文档

本文档描述泡泡爪宠物洗护预约开放 API。接口面向第三方平台创建、查询、改约和取消客户预约；门店内部的确认、到店、完成和员工备注仍由员工后台处理。

## 1. 基础信息

本地测试地址：

```txt
http://localhost:3010
```

生产环境地址请替换为实际部署域名：

```txt
https://your-domain.example.com
```

接口版本前缀：

```txt
/api/v1
```

请求和响应默认使用 JSON：

```http
Content-Type: application/json
```

## 2. 鉴权

所有开放 API 都需要 Bearer API Key：

```http
Authorization: Bearer <api_key>
```

示例：

```bash
curl "http://localhost:3010/api/v1/appointment-packages" \
  -H "Authorization: Bearer <api_key>"
```

创建 API client：

```bash
API_CLIENT_NAME="测试平台" npm run api-client:create
```

注意：API key 只在创建时显示一次，数据库只保存哈希，后续无法找回明文。

## 3. 通用错误格式

错误响应统一为：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "预约信息不完整或格式不正确。",
    "details": {
      "phone": "请填写可联系的手机号码。"
    }
  }
}
```

常见错误码：

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 请求参数缺失或格式错误 |
| 401 | `UNAUTHORIZED` | 缺少、无效或已停用 API Key |
| 404 | `APPOINTMENT_NOT_FOUND` | 预约不存在，或不属于当前 API client |
| 409 | `DUPLICATE_EXTERNAL_ID` | 同一外部预约编号重复提交 |
| 422 | `INVALID_STATUS_TRANSITION` | 当前预约状态不允许该操作 |
| 500 | `INTERNAL_ERROR` | 服务端暂时不可用 |

## 4. 数据字典

预约状态：

| status | 中文 |
| --- | --- |
| `pending` | 待确认 |
| `confirmed` | 已确认 |
| `arrived` | 已到店 |
| `completed` | 已完成 |
| `canceled` | 已取消 |

开放 API 创建的预约默认状态为 `pending`。第三方平台不能直接把预约改为 `confirmed`、`arrived` 或 `completed`。

固定预约时段：

```txt
10:30
14:00
17:30
```

固定套餐：

```txt
轻盈洁净
全身精护
造型焕新
```

预约对象字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 预约 ID |
| `customerName` | string \| null | 客户称呼 |
| `phone` | string | 联系电话 |
| `petType` | string | 宠物类型 |
| `petName` | string \| null | 宠物名字 |
| `packageName` | string \| null | 套餐名 |
| `appointmentDate` | string | 预约日期，格式 `YYYY-MM-DD` |
| `appointmentTime` | string | 预约时段 |
| `customerNote` | string \| null | 客户备注 |
| `status` | string | 预约状态 |
| `statusText` | string | 预约状态中文 |
| `source` | string | 来源，开放 API 固定为 `api` |
| `externalSource` | string \| null | 第三方平台来源 |
| `externalId` | string \| null | 第三方平台预约编号 |
| `createdAt` | string | 创建时间，ISO 8601 |
| `updatedAt` | string | 更新时间，ISO 8601 |

## 5. 创建预约

```http
POST /api/v1/appointments
```

请求体：

```json
{
  "customerName": "王女士",
  "phone": "13800138000",
  "petType": "猫咪",
  "petName": "小王",
  "packageName": "全身精护",
  "appointmentDate": "2026-05-12",
  "appointmentTime": "14:00",
  "customerNote": "猫咪比较胆小",
  "externalSource": "wechat-miniapp",
  "externalId": "order-10001"
}
```

字段规则：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `customerName` | 否 | 最多 40 字符 |
| `phone` | 是 | 6-30 位，允许数字、空格、`+`、`-`、括号 |
| `petType` | 是 | 最多 40 字符 |
| `petName` | 否 | 最多 60 字符 |
| `packageName` | 否 | 必须是固定套餐之一 |
| `appointmentDate` | 是 | 格式 `YYYY-MM-DD` |
| `appointmentTime` | 是 | 必须是固定时段之一 |
| `customerNote` | 否 | 最多 500 字符 |
| `externalSource` | 否 | 最多 60 字符 |
| `externalId` | 否 | 最多 120 字符 |

`externalSource + externalId` 用于第三方幂等去重。同一 API client 下重复提交相同组合会返回 `409 DUPLICATE_EXTERNAL_ID`。

成功响应：

```json
{
  "id": "03976484-4509-41a5-b026-fc4e804e6174",
  "customerName": "王女士",
  "phone": "13800138000",
  "petType": "猫咪",
  "petName": "小王",
  "packageName": "全身精护",
  "appointmentDate": "2026-05-12",
  "appointmentTime": "14:00",
  "customerNote": "猫咪比较胆小",
  "status": "pending",
  "statusText": "待确认",
  "source": "api",
  "externalSource": "wechat-miniapp",
  "externalId": "order-10001",
  "createdAt": "2026-05-11T13:55:08.776Z",
  "updatedAt": "2026-05-11T13:55:08.776Z"
}
```

curl 示例：

```bash
curl -X POST "http://localhost:3010/api/v1/appointments" \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "王女士",
    "phone": "13800138000",
    "petType": "猫咪",
    "petName": "小王",
    "packageName": "全身精护",
    "appointmentDate": "2026-05-12",
    "appointmentTime": "14:00",
    "externalSource": "test-platform",
    "externalId": "order-10001"
  }'
```

## 6. 查询预约列表

```http
GET /api/v1/appointments
```

查询参数：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `from` | 否 | 开始日期，默认今天前 30 天 |
| `to` | 否 | 结束日期，默认今天后 90 天 |
| `status` | 否 | 预约状态 |
| `phone` | 否 | 手机号精确匹配 |
| `externalSource` | 否 | 外部平台来源 |
| `externalId` | 否 | 外部平台预约编号 |
| `limit` | 否 | 默认 50，最大 100 |

当前 API client 只能查询自己创建的预约。

成功响应：

```json
{
  "items": [
    {
      "id": "03976484-4509-41a5-b026-fc4e804e6174",
      "customerName": "王女士",
      "phone": "13800138000",
      "petType": "猫咪",
      "petName": "小王",
      "packageName": "全身精护",
      "appointmentDate": "2026-05-12",
      "appointmentTime": "14:00",
      "customerNote": null,
      "status": "pending",
      "statusText": "待确认",
      "source": "api",
      "externalSource": "test-platform",
      "externalId": "order-10001",
      "createdAt": "2026-05-11T13:55:08.776Z",
      "updatedAt": "2026-05-11T13:55:08.776Z"
    }
  ]
}
```

curl 示例：

```bash
curl "http://localhost:3010/api/v1/appointments?from=2026-05-01&to=2026-05-31&status=pending" \
  -H "Authorization: Bearer <api_key>"
```

## 7. 查询单个预约

```http
GET /api/v1/appointments/{id}
```

成功响应为单个预约对象。

curl 示例：

```bash
curl "http://localhost:3010/api/v1/appointments/03976484-4509-41a5-b026-fc4e804e6174" \
  -H "Authorization: Bearer <api_key>"
```

如果预约不存在，或不属于当前 API client，返回 `404 APPOINTMENT_NOT_FOUND`。

## 8. 修改预约

```http
PATCH /api/v1/appointments/{id}
```

请求体字段和创建预约一致。修改时需要提交完整客户侧预约信息。

请求体：

```json
{
  "customerName": "王女士",
  "phone": "13800138000",
  "petType": "猫咪",
  "petName": "小王",
  "packageName": "造型焕新",
  "appointmentDate": "2026-05-13",
  "appointmentTime": "17:30",
  "customerNote": "客户改到下午",
  "externalSource": "wechat-miniapp",
  "externalId": "order-10001"
}
```

限制：

- 已取消的预约不能修改。
- 已完成的预约不能修改。
- 不能通过开放 API 修改员工备注。
- 不能通过开放 API 修改为确认、到店或完成状态。

curl 示例：

```bash
curl -X PATCH "http://localhost:3010/api/v1/appointments/03976484-4509-41a5-b026-fc4e804e6174" \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "王女士",
    "phone": "13800138000",
    "petType": "猫咪",
    "petName": "小王",
    "packageName": "造型焕新",
    "appointmentDate": "2026-05-13",
    "appointmentTime": "17:30",
    "customerNote": "客户改到下午",
    "externalSource": "test-platform",
    "externalId": "order-10001"
  }'
```

## 9. 取消预约

```http
POST /api/v1/appointments/{id}/cancel
```

请求体：

```json
{
  "reason": "客户临时有事"
}
```

`reason` 可选，最多 300 字符。

限制：

- 已取消的预约不能重复取消。
- 已完成的预约不能取消。

curl 示例：

```bash
curl -X POST "http://localhost:3010/api/v1/appointments/03976484-4509-41a5-b026-fc4e804e6174/cancel" \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"客户临时有事"}'
```

## 10. 查询可预约时段

```http
GET /api/v1/appointment-slots?date=2026-05-12
```

当前第一版不做时段容量限制，所有固定时段都返回 `available: true`。

成功响应：

```json
{
  "date": "2026-05-12",
  "slots": [
    {
      "time": "10:30",
      "available": true
    },
    {
      "time": "14:00",
      "available": true
    },
    {
      "time": "17:30",
      "available": true
    }
  ]
}
```

curl 示例：

```bash
curl "http://localhost:3010/api/v1/appointment-slots?date=2026-05-12" \
  -H "Authorization: Bearer <api_key>"
```

## 11. 查询套餐

```http
GET /api/v1/appointment-packages
```

成功响应：

```json
{
  "items": [
    {
      "name": "轻盈洁净"
    },
    {
      "name": "全身精护"
    },
    {
      "name": "造型焕新"
    }
  ]
}
```

curl 示例：

```bash
curl "http://localhost:3010/api/v1/appointment-packages" \
  -H "Authorization: Bearer <api_key>"
```

## 12. 第三方联调建议

1. 先调用套餐和时段接口，确认 API Key 可用。
2. 创建预约时始终传 `externalSource` 和 `externalId`，用于防重复提交。
3. 创建成功后保存返回的 `id`，后续查询、改约、取消优先使用该 ID。
4. 如果网络超时但第三方已有 `externalId`，不要直接重试生成新编号；应先按 `externalSource + externalId` 查询是否已创建。
5. 不要在客户端或前端页面暴露长期有效的 API Key；小程序、第三方后端或可信服务端应代为调用。
