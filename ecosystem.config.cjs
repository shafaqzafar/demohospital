const path = require('path');

module.exports = {
  apps: [
    {
      name: 'demohospital-backend',
      script: path.join(__dirname, 'backend', 'dist', 'server.js'),
      cwd: '/var/www/demohospital',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
