module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https://localhost:1337 ', 'http://10.10.30.182:1337'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            '*', // Cho phép tất cả các nguồn ảnh
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            '*', // Cho phép tất cả các nguồn media
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: '*', // Cho phép tất cả các origin (development mode)
      // Không bật credentials khi origin = '*' vì trình duyệt sẽ chặn
      // Access-Control-Allow-Origin: '*' kết hợp với Access-Control-Allow-Credentials: true
      credentials: false,
      // Chỉ định rõ các header client có thể gửi trong preflight
      // Thêm 'X-HTTP-Method-Override' để hỗ trợ fallback khi server chặn PUT/PATCH
      headers: [
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-HTTP-Method-Override",
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
