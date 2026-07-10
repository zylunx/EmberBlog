# img2color

轻量级图片主色调提取 API，支持 Vercel Serverless 单文件部署。

网址为：https://img2color-go-jade.vercel.app/

## 请求示例

```bash
curl "https://img2color-go-jade.vercel.app/api?img=https%3A%2F%2Fexample.com%2Fimage.jpg&format=hex&colors=5"
```

## API

### `GET /api`

参数：

- `img`：必填，完整图片 URL

+ `format`:可选，返回颜色的格式：`hex`、`rgb`、`hsl`、`cmyk`四种，默认使用hex
+ `colors`:可选，返回的颜色数量，范围 `1-10`，默认 `1`
+ `maxWidth`：可选，缩放最长边，默认 `400`
+ `skipBackground`：可选，是否忽略边缘 10% 区域，默认 `false`
+ `algorithm`：`mediancut` 或 `kmeans`，默认 `mediancut`

响应：

`format`为`hex`,`colors`为`1`时或为空时：

```json
{
  "code": 0,
  "data": {
    "dominant": "#FF6B6B",
    "palette": [{ "color": "#FF6B6B", "ratio": 0.35 }],
    "format": "hex",
    "width": 1920,
    "height": 1080
  },
  "message": "success"
}
```

或者

`format`为`hsl`,`colors`为`1`时或为空时：

```
{
  "code": 0,
  "data": {
    "dominant": {
      "h": 33,
      "s": 12,
      "l": 55
    },
    "palette": [
      {
        "color": {
          "h": 33,
          "s": 12,
          "l": 55
        },
        "ratio": 0.5
      }
    ],
    "format": "hsl",
    "width": 2364,
    "height": 1773
  },
  "message": "success"
}
```



请求：`https://img2color-go-jade.vercel.app/api?img=https://img.laplace.de5.net/file/blog/Gk79AwEG.webp&format=hex&colors=5&skipBackground=true`

返回

```json
{
  "code": 0,
  "data": {
    "dominant": "#141517",
    "palette": [
      {
        "color": "#141517",
        "ratio": 0.25
      },
      {
        "color": "#536077",
        "ratio": 0.25
      },
      {
        "color": "#E3BD8A",
        "ratio": 0.25
      },
      {
        "color": "#3F2220",
        "ratio": 0.125
      },
      {
        "color": "#B6722F",
        "ratio": 0.125
      }
    ],
    "format": "hex",
    "width": 2364,
    "height": 1773
  },
  "message": "success"
}
```



