const $ = id => document.getElementById(id);
function toast(msg){ const e=document.createElement('div'); e.textContent=msg; e.style.position='fixed'; e.style.right='18px'; e.style.bottom='18px'; e.style.padding='10px'; e.style.background='rgba(6,14,32,0.95)'; e.style.color='#dff8ff'; e.style.borderRadius='8px'; document.body.appendChild(e); setTimeout(()=>e.remove(),3000); }

/* minimal chart */
let myChart;
function initChart(){
  try{
    const ctx = $('chart').getContext('2d');
    myChart = new Chart(ctx, { type:'line', data:{ labels:[], datasets:[{label:'issued', data:[], borderColor:'#00f0e0', backgroundColor:'rgba(0,240,224,0.06)', fill:true, tension:0.45}]}, options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
  }catch(e){console.warn(e)}
}

/* QR */
function drawQR(text){
  const box = $('qrcode'); box.innerHTML='';
  try{ new QRCode(box, { text, width:170, height:170, colorDark:"#000000", colorLight:"#ffffff" }); } catch(e){ box.innerText='QR error'; }
}

/* Robot follow */
(function(){
  const pL = document.getElementById('pupilL'), pR = document.getElementById('pupilR'), robot = document.getElementById('robotCard');
  let W=innerWidth,H=innerHeight;
  window.addEventListener('resize', ()=>{W=innerWidth;H=innerHeight});
  window.addEventListener('pointermove', e=>{
    const map=(v,a,b,c,d)=>c+(v-a)*(d-c)/(b-a);
    const pxL = Math.max(100,Math.min(140,map(e.clientX,0,W,100,140)));
    const pyL = Math.max(120,Math.min(150,map(e.clientY,0,H,120,150)));
    const pxR = Math.max(220,Math.min(260,map(e.clientX,0,W,220,260)));
    const pyR = Math.max(120,Math.min(150,map(e.clientY,0,H,120,150)));
    if(pL){pL.setAttribute('cx',pxL);pL.setAttribute('cy',pyL)}
    if(pR){pR.setAttribute('cx',pxR);pR.setAttribute('cy',pyR)}
    if(robot){ const rx=(e.clientX-W/2)/140; const ry=(e.clientY-H/2)/220; robot.style.transform=`translateY(${Math.max(-12,Math.min(12,-ry))}px) rotate(${rx}deg)` }
  });
})();

/* contract config (replace RPC/contract as needed) */
const contractAddress = "0xc7BD099627d1C65170a34a3215aB2FC1937d419C";
const contractABI = [ /* ABI kept minimal (same as before) */
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"certId","type":"string"},{"indexed":false,"internalType":"string","name":"studentName","type":"string"},{"indexed":false,"internalType":"string","name":"courseName","type":"string"},{"indexed":false,"internalType":"string","name":"certHash","type":"string"},{"indexed":false,"internalType":"uint256","name":"issueDate","type":"uint256"},{"indexed":false,"internalType":"address","name":"issuer","type":"address"}],"name":"CertificateIssued","type":"event"},
  {"inputs":[{"internalType":"string","name":"certId","type":"string"},{"internalType":"string","name":"studentName","type":"string"},{"internalType":"string","name":"courseName","type":"string"},{"internalType":"string","name":"certHash","type":"string"}],"name":"issueCertificate","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"certId","type":"string"}],"name":"verifyCertificate","outputs":[{"internalType":"string","name":"studentName","type":"string"},{"internalType":"string","name":"courseName","type":"string"},{"internalType":"string","name":"certHash","type":"string"},{"internalType":"uint256","name":"issueDate","type":"uint256"},{"internalType":"address","name":"issuer","type":"address"}],"stateMutability":"view","type":"function"}
];

let provider, signer, contract;
let issuedCount = 0;

async function connectWallet(){
  try{
    if(!window.ethereum){ toast('Install MetaMask'); return; }
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    $('addrShort')?.remove(); // safe
    $('networkBadge').innerText = addr.slice(0,6)+'...'+addr.slice(-4);
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    toast('Wallet connected');
    try{ contract.on('CertificateIssued', (certId, studentName, courseName, certHash, issueDate, issuer)=>{ addIssuedLog(`Event ${certId}`); incrementCount(); }); }catch(e){}
  }catch(e){ console.error(e); toast('Connect failed') }
}

function addIssuedLog(txt){
  const box = $('issuedBox'); const node=document.createElement('div'); node.textContent=txt; node.style.fontSize='13px'; node.style.color='#cfefff'; if(box){ box.prepend(node) }
}

function incrementCount(){
  issuedCount++; $('count').innerText = issuedCount;
  if(myChart){ myChart.data.labels.push(''); myChart.data.datasets[0].data.push(Math.floor(Math.random()*6)+1); myChart.update(); }
}

async function autoDownloadPDF(obj){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'landscape',unit:'pt',format:'a4'});
  doc.setFillColor(6,14,32); doc.rect(0,0,doc.internal.pageSize.width,doc.internal.pageSize.height,'F');
  doc.setFontSize(26); doc.setTextColor(255,255,255); doc.text('BlockSense — Certificate',60,70);
  doc.setFontSize(16); doc.setTextColor(200,220,235); doc.text('Tamper-proof on-chain certificate',60,92);
  doc.setFillColor(255,255,255,0.03); doc.rect(60,120,620,220,'F');
  doc.setFontSize(20); doc.setTextColor(255,255,255); doc.text(obj.student || 'Recipient',80,160);
  doc.setFontSize(12); doc.setTextColor(200,220,235); doc.text(`Course: ${obj.course || '—'}`,80,190);
  doc.text(`Certificate ID: ${obj.certId || '—'}`,80,210);
  doc.text(`Issued: ${obj.issueDate || new Date().toLocaleString()}`,80,230);
  const qrCanvas = $('qrcode').querySelector('canvas');
  if(qrCanvas){ const data = qrCanvas.toDataURL('image/png'); doc.addImage(data,'PNG',720,120,120,120) }
  doc.setFontSize(10); doc.setTextColor(180,200,220); doc.text('Issuer: BlockSense • Contract: '+contractAddress,60,doc.internal.pageSize.height-60);
  const filename = (obj.certId || 'certificate') + '.pdf';
  doc.save(filename);
}

async function issueCertificate(){
  if(!contract){ toast('Connect wallet first'); return; }
  const certId = $('certId').value.trim(); if(!certId){ toast('Enter certificate ID'); return; }
  const student = $('studentName').value.trim(); const course = $('courseName').value.trim();
  const raw = $('rawHash').value.trim();
  const certHash = raw ? ethers.utils.id(raw) : ethers.utils.hexlify(ethers.utils.randomBytes(12));
  try{
    $('issueBtn').disabled = true; $('txStatus').innerText = 'Sending transaction...';
    const tx = await contract.issueCertificate(certId, student, course, certHash);
    addIssuedLog('Tx: '+tx.hash);
    toast('Tx sent');
    await tx.wait();
    $('txStatus').innerText = 'Mined: '+tx.hash;
    const issued = { certId, student, course, certHash, issueDate: new Date().toLocaleString(), issuer: await signer.getAddress() };
    $('issuedJson').innerText = JSON.stringify(issued, null, 2);
    $('issuedBox').style.display = 'block';
    const url = window.location.origin + '/verify.html?certId=' + encodeURIComponent(certId);
    drawQR(url);
    incrementCount();
    autoDownloadPDF(issued);
  }catch(e){ console.error(e); toast('Tx failed'); $('txStatus').innerText = 'Tx failed'; }
  finally{ $('issueBtn').disabled = false; }
}

async function verifyCertificate(){
  if(!contract){ toast('Connect wallet first'); return; }
  const id = $('verifyId').value.trim(); if(!id){ toast('Enter cert ID'); return; }
  try{
    const out = await contract.verifyCertificate(id);
    const studentName = out[0] || '—';
    const courseName = out[1] || '—';
    const issueDate = (out[3] && out[3].toNumber) ? new Date(out[3].toNumber()*1000).toLocaleString() : out[3];
    const issuer = out[4] || '—';
    $('vStudent').innerText = studentName;
    $('vCourse').innerText = courseName;
    $('vMeta').innerText = `Certificate ID: ${id}`;
    $('vIssuer').innerText = issuer;
    $('vDate').innerText = issueDate || '—';
    $('vStatus').innerText = 'VALID';
    $('verifyRes').style.display = 'flex';
    toast('Verified: VALID');
  }catch(e){
    $('vStudent').innerText = '—';
    $('vCourse').innerText = '';
    $('vMeta').innerText = `Certificate ID: ${id}`;
    $('vIssuer').innerText = '—';
    $('vDate').innerText = '—';
    $('vStatus').innerText = 'NOT FOUND';
    $('verifyRes').style.display = 'flex';
    toast('Not found');
  }
}

window.addEventListener('load', ()=>{
  initChart();
  $('connectBtn').addEventListener('click', connectWallet);
  $('issueBtn').addEventListener('click', issueCertificate);
  $('qrBtn').addEventListener('click', ()=>{ const id = $('certId').value.trim(); if(!id){ toast('Enter cert ID'); return; } drawQR(window.location.origin + '/verify.html?certId='+encodeURIComponent(id)); toast('QR generated')});
  $('verifyBtn').addEventListener('click', verifyCertificate);
  $('exportPdfBtn').addEventListener('click', ()=>{ const issuedText = $('issuedJson').innerText; const obj = issuedText ? JSON.parse(issuedText) : { certId:$('certId').value||'N/A', student:$('studentName').value||'N/A', course:$('courseName').value||'N/A', issueDate:new Date().toLocaleString() }; autoDownloadPDF(obj) });
  drawQR(window.location.origin);
});

