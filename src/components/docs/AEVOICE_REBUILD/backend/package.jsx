{
  "name": "@aevoice/backend",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.js",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.4.5",
    "node-fetch": "^3.3.2",
    "express-session": "^1.18.0",
    "jsonwebtoken": "^9.0.2",
    "express-rate-limit": "^7.2.0",
    "morgan": "^1.10.0",
    "http-proxy-middleware": "^3.0.2"
  }
}