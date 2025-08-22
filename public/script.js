document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById(btn.dataset.tab);
    if (tab) tab.classList.add('active');
  });
});

const nextProxyBtn = document.getElementById('nextProxy');
if (nextProxyBtn) {
  nextProxyBtn.addEventListener('click', async () => {
    const res = await fetch('/proxies/next');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('proxyDisplay').textContent = JSON.stringify(data, null, 2);
    } else {
      document.getElementById('proxyDisplay').textContent = 'Ошибка получения прокси';
    }
  });
}

// macros
async function loadMacros() {
  const res = await fetch('/macros');
  if (!res.ok) return;
  const data = await res.json();
  const list = document.getElementById('macroList');
  if (!list) return;
  list.innerHTML = '';
  data.forEach(m => {
    const li = document.createElement('li');
    li.textContent = `${m.name}: ${m.value}`;
    list.appendChild(li);
  });
}
loadMacros();

document.getElementById('macroForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  await fetch('/macros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: form.name.value, value: form.value.value })
  });
  form.reset();
  loadMacros();
});

// attachments
document.getElementById('attachUpload')?.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch('/attachments/upload', { method: 'POST', body: formData });
  const data = await res.json();
  const list = document.getElementById('attachList');
  const li = document.createElement('li');
  li.textContent = data.macro;
  list.appendChild(li);
  e.target.reset();
});

// emails upload
document.getElementById('emailUpload')?.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch('/emails/upload', { method: 'POST', body: formData });
  const data = await res.json();
  document.getElementById('emailsResult').textContent = JSON.stringify(data);
  e.target.reset();
});

// proxy upload
document.getElementById('proxyUpload')?.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch('/proxies/upload', { method: 'POST', body: formData });
  const data = await res.json();
  document.getElementById('proxyDisplay').textContent = JSON.stringify(data);
  e.target.reset();
});

// account upload
document.getElementById('accountUpload')?.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch('/accounts/upload', { method: 'POST', body: formData });
  const data = await res.json();
  const list = document.getElementById('accountList');
  list.innerHTML = `Всего: ${data.count}`;
  e.target.reset();
});

// letter form stub
document.getElementById('letterForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    subject: form.subject.value,
    body: form.body.value,
    attachments: form.attachments.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  };
  const res = await fetch('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  document.getElementById('letterResult').textContent = JSON.stringify(data);
  form.reset();
});
