#!/bin/bash
# Daily snapshot cron - runs via docker compose exec
cd /home/allen/whatisms
CRON_SECRET=$(grep CRON_SECRET personal-finance/.env | cut -d= -f2)
docker compose exec -T finance node -e "
  const http = require('http');
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/finance/api/snapshots/auto',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${CRON_SECRET}',
      'Content-Type': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(data));
  });
  req.end();
"
