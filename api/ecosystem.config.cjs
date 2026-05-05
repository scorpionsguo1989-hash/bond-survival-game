// PM2 部署配置 - 阿里云 bond-game-api 进程
//
// 用法:
//   cd /opt/bond-game-api/
//   pm2 start ecosystem.config.cjs
//   pm2 save                           # 持久化进程列表(重启自启)
//   pm2 reload ecosystem.config.cjs --update-env  # 部署后热重载
//
// 日志:
//   pm2 logs bond-game-api             # 实时
//   tail -f /var/log/bond-game-api/error.log

module.exports = {
  apps: [
    {
      name: 'bond-game-api',
      script: 'server.js',
      cwd: '/opt/bond-game-api/',

      // 生产环境变量 (覆盖 .env, 也覆盖 server.js 默认值)
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_PATH: '/opt/bond-game-api/leaderboard.db',
        ALLOWED_ORIGINS: 'https://gaozhai.cn',
      },

      // 单实例 (SQLite 不支持多进程并发写)
      instances: 1,
      exec_mode: 'fork',

      // 进程崩溃自动重启
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // 内存超限重启 (better-sqlite3 内存稳定, 300M 给充分余量)
      max_memory_restart: '300M',

      // 不监听文件变化 (生产环境禁用, 部署用 pm2 reload 显式触发)
      watch: false,

      // 日志输出
      log_file: '/var/log/bond-game-api/combined.log',
      error_file: '/var/log/bond-game-api/error.log',
      out_file: '/var/log/bond-game-api/out.log',
      time: true, // 给每行日志加时间戳
    },
  ],
};
