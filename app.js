const contractAddress = "0xc7BD099627d1C65170a34a3215aB2FC1937d419C";
const contractABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "certId",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "studentName",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "courseName",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "certHash",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "issueDate",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "issuer",
				"type": "address"
			}
		],
		"name": "CertificateIssued",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "certId",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "studentName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "courseName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "certHash",
				"type": "string"
			}
		],
		"name": "issueCertificate",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "certId",
				"type": "string"
			}
		],
		"name": "verifyCertificate",
		"outputs": [
			{
				"internalType": "string",
				"name": "studentName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "courseName",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "certHash",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "issueDate",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "issuer",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];
const PUBLIC_RPC = "https://rpc.sepolia.org";

const $ = id => document.getElementById(id);
function toast(msg){ const e = document.createElement('div'); e.className='toast'; e.innerText = msg; $('toast').appendChild(e); setTimeout(()=> e.remove(),4200); }

let myChart;
function initChart(){ try{ const c = $('chart').getContext('2d'); myChart = new Chart(c, { type:'line', data:{ labels:[], datasets:[{label:'issued', data:[], borderColor:'#00f0e0', backgroundColor:'rgba(0,240,224,0.07)', fill:true, tension:0.45}]}, options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}}); }catch(e){console.warn('Chart init failed', e);} }

(function robotFollow(){
  const pL = document.getElementById('pupilL'), pR = document.getElementById('pupilR'), robot = document.getElementById('robotCard');
  let W = window.innerWidth, H = window.innerHeight;
  window.addEventListener('resize', ()=>{ W = window.innerWidth; H = window.innerHeight; });
  window.addEventListener('pointermove', (e)=>{
    const map = (v,a,b,c,d) => c + (v-a)*(d-c)/(b-a);
    const pxL = Math.max(100, Math.min(140, map(e.clientX,0,W,100,140)));
    const pyL = Math.max(120, Math.min(150, map(e.clientY,0,H,120,150)));
    const pxR = Math.max(220, Math.min(260, map(e.clientX,0,W,220,260)));
    const pyR = Math.max(120, Math.min(150, map(e.clientY,0,H,120,150)));
    if(pL){ pL.setAttribute('cx', pxL); pL.setAttribute('cy', pyL); }
    if(pR){ pR.setAttribute('cx', pxR); pR.setAttribute('cy', pyR); }
    const rx = (e.clientX - W/2)/140; const ry = (e.clientY - H/2)/220;
    if(robot) robot.style.transform = `translateY(${Math.max(-12, Math.min(12, -ry))}px) rotate(${rx}deg)`;
  });
})();

function drawQR(text, size = 280){
  const box = $('qrcode'); box.innerHTML = '';
  try{
    new QRCode(box, { text, width: size, height: size, colorDark:"#000000", colorLight:"#ffffff" });
    const canvas = box.querySelector('canvas');
    if(canvas){ canvas.style.width = size + 'px'; canvas.style.height = size + 'px'; canvas.style.imageRendering = 'pixelated'; }
  }catch(e){ console.error('QR fail', e); box.innerText='QR error'; }
}

let provider, signer, contract;
let issuedCount = 0;

async function connectWallet(){
  try{
    if(!window.ethereum){ toast('MetaMask not installed'); return; }
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    $('addrShort').innerText = addr.slice(0,6) + '...' + addr.slice(-4);
    const net = await provider.getNetwork();
    $('netLabel').innerText = net.name || net.chainId;
    $('networkBadge').innerText = 'Connected';
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    toast('Wallet connected');
    try{ contract.on('CertificateIssued', (certId, studentName, courseName, certHash, issueDate, issuer) => { addTxDisplay(`Event: ${certId} by ${issuer}`); incrementCount(); }); }catch(e){}
  }catch(e){ console.error(e); toast('Connect failed: '+(e?.message||e)); }
}

async function issueCertificate(){
  if(!contract){ toast('Connect wallet first'); return; }
  const certId = $('certId').value.trim(); if(!certId){ toast('Enter certificate ID'); return; }
  const student = $('studentName').value.trim(); const course = $('courseName').value.trim();
  const raw = $('rawHash').value.trim();
  const certHash = raw ? ethers.utils.id(raw) : ethers.utils.hexlify(ethers.utils.randomBytes(12));
  try{
    $('issueBtn').disabled=true; $('txStatus').innerText = 'Sending transaction...';
    const tx = await contract.issueCertificate(certId, student, course, certHash);
    addTxDisplay(`Tx: ${tx.hash}`);
    toast('Tx sent: ' + tx.hash);
    await tx.wait();
    $('txStatus').innerText = 'Mined: ' + tx.hash;
    const issued = { certId, student, course, certHash, issueDate: new Date().toLocaleString(), issuer: await signer.getAddress() };
    $('issuedJson').innerText = JSON.stringify(issued, null, 2);
    $('issuedBox').style.display = 'block';
    const url = window.location.origin + location.pathname + '?certId=' + encodeURIComponent(certId);
    drawQR(url, 280);
    incrementCount();
  }catch(e){ console.error(e); toast('Tx failed: '+(e?.message||e)); $('txStatus').innerText = 'Tx failed'; }
  finally{ $('issueBtn').disabled=false; }
}

function addTxDisplay(txt){
  const node = document.createElement('div'); node.style.marginBottom='8px'; node.style.color='#cfefff';
  node.innerText = (typeof txt === 'string' ? txt : JSON.stringify(txt)).slice(0,400);
  $('issuedBox').prepend(node);
}
function incrementCount(){ issuedCount++; $('count').innerText = issuedCount; if(myChart){ myChart.data.labels.push(''); myChart.data.datasets[0].data.push(Math.floor(Math.random()*6)+1); myChart.update(); } }

async function exportPDF(){
  const issuedText = $('issuedJson').innerText;
  const obj = issuedText ? JSON.parse(issuedText) : { certId: $('certId').value||'N/A', student: $('studentName').value||'N/A', course: $('courseName').value||'N/A', issueDate: new Date().toLocaleString() };
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
  doc.setFillColor(6,14,32); doc.rect(0,0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
  doc.setDrawColor(139,99,255); doc.setLineWidth(6); doc.rect(18,18, doc.internal.pageSize.width-36, doc.internal.pageSize.height-36, 'S');
  doc.setFontSize(28); doc.setTextColor(255,255,255); doc.text('BlockSense — Certificate', 60, 80);
  doc.setFontSize(14); doc.setTextColor(200,220,235); doc.text('Tamper-proof on-chain certificate — verify using QR or contract', 60, 104);
  doc.setFillColor(255,255,255,0.03); doc.rect(60,130,620,170,'F');
  doc.setFontSize(22); doc.setTextColor(255,255,255); doc.text(obj.student || 'Recipient Name', 80, 170);
  doc.setFontSize(12); doc.setTextColor(200,220,235); doc.text('Course: ' + (obj.course || '—'), 80, 200);
  doc.text('Certificate ID: ' + (obj.certId || '—'), 80, 220);
  doc.text('Issued: ' + (obj.issueDate || new Date().toLocaleString()), 80, 240);
  const qrCanvas = $('qrcode').querySelector('canvas');
  if(qrCanvas){ const data = qrCanvas.toDataURL('image/png'); doc.addImage(data,'PNG',700,140,120,120); }
  doc.setFontSize(10); doc.setTextColor(190,210,230); doc.text('Issuer: BlockSense • Contract: ' + (contractAddress || '—'), 60, doc.internal.pageSize.height - 60);
  doc.save((obj.certId || 'certificate') + '.pdf');
}

function renderVerifyCard(obj){
  const area = document.getElementById('verifyRes'); area.style.display = 'block';
  document.getElementById('vStudent').innerText = obj.studentName || '—';
  document.getElementById('vCourse').innerText = obj.courseName || '—';
  document.getElementById('vMeta').innerText = `Certificate ID: ${obj.certId || '—'}`;
  document.getElementById('vIssuer').innerText = obj.issuer || '—';
  document.getElementById('vDate').innerText = obj.issueDate || '—';
  document.getElementById('vStatus').innerText = obj.valid ? 'VALID' : 'NOT FOUND';

  const verifyQRBoxId = 'verifyQR_internal';
  let existing = document.getElementById(verifyQRBoxId);
  if(!existing){
    existing = document.createElement('div'); existing.id = verifyQRBoxId; existing.style.width='160px'; existing.style.height='160px'; existing.style.marginTop='12px';
    const right = document.querySelector('.verify-right'); if(right) right.appendChild(existing);
  }
  existing.innerHTML = '';
  const verifyLink = window.location.origin + location.pathname + '?certId=' + encodeURIComponent(obj.certId || '');
  try{ new QRCode(existing, { text: verifyLink, width:160, height:160, colorDark:"#000000", colorLight:"#ffffff" }); }catch(e){}
}

async function verifyWithoutWallet(certId){
  try{
    const provider = new ethers.providers.JsonRpcProvider(PUBLIC_RPC);
    const roContract = new ethers.Contract(contractAddress, contractABI, provider);
    const out = await roContract.verifyCertificate(certId);
    const issueDate = (out[3] && out[3].toNumber) ? new Date(out[3].toNumber()*1000).toLocaleString() : (out[3] || '');
    const obj = { certId, studentName: out[0], courseName: out[1], certHash: out[2], issueDate, issuer: out[4], valid: true };
    renderVerifyCard(obj);
    toast('Certificate verified (public RPC)');
  }catch(err){
    const obj = { certId, studentName: '—', courseName: '—', certHash: '', issueDate: '', issuer: '—', valid: false };
    renderVerifyCard(obj);
    toast('Verify failed or not found');
  }
}

async function verifyCertificate(){
  const id = $('verifyId').value.trim();
  if(!id){ toast('Enter cert ID'); return; }
  if(PUBLIC_RPC && PUBLIC_RPC.length>10){ await verifyWithoutWallet(id); return; }
  if(!contract){ toast('Connect wallet to verify'); return; }
  try{
    const out = await contract.verifyCertificate(id);
    const issueDate = (out[3] && out[3].toNumber) ? new Date(out[3].toNumber()*1000).toLocaleString() : out[3];
    const obj = { certId: id, studentName: out[0], courseName: out[1], certHash: out[2], issueDate, issuer: out[4], valid: true };
    renderVerifyCard(obj);
    toast('Certificate verified');
  }catch(e){
    const obj = { certId: id, studentName: '—', courseName: '—', certHash: '', issueDate: '', issuer: '—', valid: false };
    renderVerifyCard(obj);
    toast('Verify failed: ' + (e?.message || 'not found'));
  }
}

window.addEventListener('load', ()=>{
  initChart();
  $('connectBtn').addEventListener('click', connectWallet);
  $('issueBtn').addEventListener('click', issueCertificate);
  $('qrBtn').addEventListener('click', ()=>{
    const id = $('certId').value.trim(); if(!id){ toast('Enter cert ID'); return; }
    drawQR(window.location.origin + location.pathname + '?certId=' + encodeURIComponent(id), 280);
    toast('QR generated (normal)');
  });
  $('verifyBtn').addEventListener('click', verifyCertificate);
  $('exportPdfBtn').addEventListener('click', exportPDF);
  drawQR(window.location.origin, 280);
  const u = new URL(location.href); const c = u.searchParams.get('certId');
  if(c){ $('verifyId').value = c; setTimeout(()=> verifyWithoutWallet(c), 200); setTimeout(()=>{ const el = document.getElementById('verifyRes'); if(el) el.scrollIntoView({behavior:'smooth'}); }, 500); }
});
