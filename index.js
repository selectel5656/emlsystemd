const express = require('express');
const session = require('express-session');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const upload = multer();

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
  })
);

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

function auth(req, res, next) {
  if (req.session && req.session.loggedIn) {
    return next();
  }
  res.redirect('/');
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  if (req.session && req.session.loggedIn) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    return res.redirect('/dashboard');
  }
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/dashboard', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// In-memory storage for demo purposes
const macros = [];
const emails = [];
const attachments = [];
const proxies = [];
const accounts = [];

// helper for proxy rotation
function getRandomProxy() {
  if (!proxies.length) return null;
  const unused = proxies.filter(p => !p.used);
  if (!unused.length) {
    proxies.forEach(p => (p.used = false));
  }
  const available = proxies.filter(p => !p.used);
  const proxy = available[Math.floor(Math.random() * available.length)];
  proxy.used = true;
  return proxy;
}

// API routes
app.get('/macros', auth, (req, res) => {
  res.json(macros);
});

app.post('/macros', auth, (req, res) => {
  const { name, value } = req.body;
  const macro = { id: uuidv4(), name, value };
  macros.push(macro);
  res.status(201).json(macro);
});

app.get('/macros/:id/test', auth, (req, res) => {
  const macro = macros.find(m => m.id === req.params.id);
  if (!macro) return res.status(404).json({ error: 'Not found' });
  res.json({ value: macro.value });
});

app.get('/emails', auth, (req, res) => {
  res.json(emails);
});

app.post('/emails', auth, (req, res) => {
  const { email, name } = req.body;
  const entry = { id: uuidv4(), email, name };
  emails.push(entry);
  res.status(201).json(entry);
});

app.post('/emails/upload', auth, upload.single('file'), (req, res) => {
  const format = req.body.format || '3';
  const content = req.file.buffer.toString('utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  lines.forEach(line => {
    let email, name;
    if (format === '1' || format === '2') {
      const match = line.match(/([^<]*)<([^>]+)>/);
      if (match) {
        name = match[1].trim().replace(/;$/, '');
        email = match[2].trim().replace(/;$/, '');
      } else {
        const m2 = line.match(/<([^>]+)>/);
        if (m2) email = m2[1].trim().replace(/;$/, '');
      }
    } else {
      email = line.trim();
    }
    if (email) {
      if (!name) name = email.split('@')[0];
      emails.push({ id: uuidv4(), email, name });
    }
  });
  res.json({ count: emails.length });
});

app.get('/attachments', auth, (req, res) => {
  res.json(attachments);
});

app.post('/attachments', auth, (req, res) => {
  const { filename, url } = req.body;
  const att = { id: uuidv4(), filename, url };
  attachments.push(att);
  res.status(201).json(att);
});

app.post('/attachments/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const id = uuidv4();
  const macroName = `attach_${id.replace(/-/g, '')}_base64`;
  const base64 = req.file.buffer.toString('base64');
  attachments.push({ id, filename: req.file.originalname, macro: macroName, base64 });
  res.status(201).json({ id, macro: `{{$${macroName}}}` });
});

app.get('/proxies', auth, (req, res) => {
  res.json(proxies);
});

app.post('/proxies', auth, (req, res) => {
  const { host, port } = req.body;
  const proxy = { id: uuidv4(), host, port, used: false };
  proxies.push(proxy);
  res.status(201).json(proxy);
});

app.post('/proxies/upload', auth, upload.single('file'), (req, res) => {
  const lines = req.file.buffer.toString('utf-8').split(/\r?\n/).filter(Boolean);
  lines.forEach(line => {
    const [host, port] = line.trim().split(':');
    if (host && port) proxies.push({ id: uuidv4(), host, port, used: false });
  });
  res.json({ count: proxies.length });
});

app.get('/proxies/next', auth, (req, res) => {
  const proxy = getRandomProxy();
  if (!proxy) return res.status(404).json({ error: 'No proxies' });
  res.json({ host: proxy.host, port: proxy.port });
});

app.get('/accounts', auth, (req, res) => {
  res.json(accounts);
});

app.post('/accounts', auth, (req, res) => {
  const { login, password, apiKey, uuid } = req.body;
  const acc = { id: uuidv4(), login, password, apiKey, uuid };
  accounts.push(acc);
  res.status(201).json(acc);
});

app.post('/accounts/upload', auth, upload.single('file'), (req, res) => {
  const lines = req.file.buffer.toString('utf-8').split(/\r?\n/).filter(Boolean);
  lines.forEach(line => {
    const [login, password, firstName, lastName, apiKey, uuid] = line.trim().split(':');
    if (uuid) {
      accounts.push({ id: uuidv4(), login, password, firstName, lastName, apiKey, uuid });
    }
  });
  res.json({ count: accounts.length });
});

// stub send endpoint
app.post('/send', auth, (req, res) => {
  const { subject, body, attachments: att } = req.body;
  res.json({ status: 'queued', subject, attachments: att });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
