/**
 * app.js
 * CONFIG: set API_BASE to your backend endpoint that returns telemetry JSON
 *
 * Example backend GET endpoint:  GET https://your-backend.example.com/api/latest
 * Response JSON shape expected (example):
 * {
 *   "uptime":"12345.67",
 *   "cpu":"0.10 0.05 0.01",
 *   "mem":"30000/65536",
 *   "wan":{"rx":1234567,"tx":987654,"speed":512},
 *   "clients":[{"ip":"192.168.1.10","mac":"aa:bb:cc","hostname":"phone","rx":1234,"tx":4321}]
 * }
 */

// ----------------- CONFIG -----------------
const API_BASE = "https://YOUR-BACKEND-URL/api/latest"; // <- REPLACE this with your backend endpoint
const POLL_MS = 3000;
// ------------------------------------------

const el = id => document.getElementById(id);

// charts data
let wanChart = null;
let cpuChart = null;
const series = { wan:[], cpu:[] };

function makeCharts(){
  const wanCtx = document.getElementById('wanChart').getContext('2d');
  wanChart = new Chart(wanCtx, {
    type:'line',
    data: { labels:[], datasets:[{label:'WAN kb/s', data:[], fill:true, tension:0.25, borderWidth:2}]},
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  const cpuCtx = document.getElementById('cpuChart').getContext('2d');
  cpuChart = new Chart(cpuCtx, {
    type:'line',
    data: { labels:[], datasets:[{label:'CPU', data:[], fill:true, tension:0.25, borderWidth:2}]},
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });
}

// helper: push sample to series (keep last 20)
function pushSeries(kind, value){
  const arr = series[kind];
  const ts = new Date().toLocaleTimeString();
  arr.push({t:ts, v: value});
  if(arr.length>20) arr.shift();
  return arr.map(s=>s.v);
}

// ui update
function updateUI(data){
  el('status').textContent = 'Live ✔';
  el('last').textContent = new Date(data._ts || Date.now()).toLocaleString();
  el('uptime').textContent = formatUptime(data.uptime||'-');
  el('cpu').textContent = (data.cpu || '-');
  el('mem').textContent = (data.mem || '-');
  el('wan').textContent = data.wan ? `${Math.round((data.wan.speed||0))} kb/s` : '-';

  // charts update
  const wanVal = data.wan?.speed ? Math.round(data.wan.speed) : 0;
  const cpuVal = parseFloat((data.cpu||'0').split(' ')[0]) || 0;

  const wanVals = pushSeries('wan', wanVal);
  const cpuVals = pushSeries('cpu', cpuVal);

  // update chart datasets
  if(wanChart){
    wanChart.data.labels = series.wan.map(s=>s.t);
    wanChart.data.datasets[0].data = wanVals;
    wanChart.update();
  }
  if(cpuChart){
    cpuChart.data.labels = series.cpu.map(s=>s.t);
    cpuChart.data.datasets[0].data = cpuVals;
    cpuChart.update();
  }

  // clients
  renderClients(data.clients || []);
}

function formatUptime(u){
  if(!u) return '-';
  // uptime may be "12345.67" seconds
  const s = Math.floor(parseFloat(u));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  return (days?days+'d ':'') + hours+'h '+mins+'m';
}

function renderClients(list){
  const wrap = document.getElementById('clients');
  wrap.innerHTML = '';
  if(list.length===0){
    wrap.innerHTML = `<div style="color:var(--muted)">No clients</div>`;
    return;
  }
  list.forEach(c=>{
    const div = document.createElement('div');
    div.className = 'client-card';
    const host = c.hostname || 'device';
    const ip = c.ip || '-';
    const mac = c.mac || '-';
    const rx = c.rx?`rx:${c.rx}`:'';
    const tx = c.tx?`tx:${c.tx}`:'';
    div.innerHTML = `<div class="client-host">${host}</div>
                     <div class="client-meta">${ip} • ${mac}</div>
                     <div class="client-meta">${rx} ${tx}</div>`;
    div.title = 'Click to copy MAC';
    div.addEventListener('click', ()=> {
      navigator.clipboard?.writeText(mac).then(()=> {
        const old = div.innerHTML;
        div.innerHTML = `<div style="color:var(--accent)">Copied ✓</div>`;
        setTimeout(()=> div.innerHTML = old, 900);
      });
    });
    wrap.appendChild(div);
  });
}

// fetch
async function fetchLatest(){
  try{
    const res = await fetch(API_BASE, {cache:'no-store'});
    if(!res.ok) throw new Error('no-data');
    const json = await res.json();
    updateUI(json);
  }catch(e){
    el('status').textContent = 'Offline / no data';
    console.warn('fetch error', e);
  }
}

// theme toggle
function initThemeToggle(){
  const btn = document.getElementById('toggleTheme');
  btn.addEventListener('click', ()=> {
    document.documentElement.classList.toggle('light');
  });
}

// quick refresh button
function initRefresh(){
  document.getElementById('refreshBtn').addEventListener('click', fetchLatest);
}

// init
window.addEventListener('load', ()=>{
  makeCharts();
  initThemeToggle();
  initRefresh();
  fetchLatest();
  setInterval(fetchLatest, POLL_MS);
});