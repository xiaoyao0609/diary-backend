// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;  // 关键修改：使用环境变量

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 数据库文件路径（Render 可写目录）
const dbPath = process.env.DB_PATH || './diary.db';
const db = new sqlite3.Database(dbPath);

// 创建日记表
db.run(`
  CREATE TABLE IF NOT EXISTS diaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    mood TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// API 路由
app.get('/api/diaries', (req, res) => {
  const sql = `SELECT * FROM diaries ORDER BY date DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/diary/:date', (req, res) => {
  const { date } = req.params;
  const sql = `SELECT * FROM diaries WHERE date = ?`;
  db.get(sql, [date], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ message: '日记不存在' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/diary', (req, res) => {
  const { date, title, content, mood } = req.body;
  if (!date || !title) {
    res.status(400).json({ error: '日期和标题不能为空' });
    return;
  }

  const checkSql = `SELECT id FROM diaries WHERE date = ?`;
  db.get(checkSql, [date], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      const updateSql = `UPDATE diaries SET title = ?, content = ?, mood = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?`;
      db.run(updateSql, [title, content, mood || '', date], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: '更新成功', id: row.id });
      });
    } else {
      const insertSql = `INSERT INTO diaries (date, title, content, mood) VALUES (?, ?, ?, ?)`;
      db.run(insertSql, [date, title, content, mood || ''], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: '保存成功', id: this.lastID });
      });
    }
  });
});

app.delete('/api/diary/:date', (req, res) => {
  const { date } = req.params;
  const deleteSql = `DELETE FROM diaries WHERE date = ?`;
  db.run(deleteSql, [date], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ message: '日记不存在' });
      return;
    }
    res.json({ message: '删除成功' });
  });
});

// 健康检查接口（Render 需要）
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`后端服务已启动：http://localhost:${PORT}`);
});