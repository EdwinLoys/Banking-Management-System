import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API  = 'https://localhost:7001';
const PAGE = 8;

const getErr = e => {
  const d = e?.response?.data;
  if (!d) return e?.message || 'Something went wrong';
  if (typeof d === 'string') return d;
  if (d.message) return d.message;
  if (d.title)   return d.title;
  if (d.errors)  return Object.values(d.errors).flat().join(', ');
  return 'Request failed';
};

const fmt  = n => parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const fmtN = n => parseFloat(n||0).toLocaleString();

const LOAN_TYPES = [
  {type:'Personal Loan',icon:'👤',rate:14.5,color:'#2c5aa0',bg:'#e8f0fb',desc:'Personal needs, education, medical',       min:10000,  max:500000,   minM:6, maxM:60 },
  {type:'Home Loan',    icon:'🏠',rate:8.5, color:'#15803d',bg:'#dcfce7',desc:'Buying or building a home',                min:500000, max:10000000, minM:60,maxM:360},
  {type:'Vehicle Loan', icon:'🚗',rate:10.5,color:'#b45309',bg:'#fef3c7',desc:'Car, motorcycle, or vehicle',              min:50000,  max:3000000,  minM:12,maxM:84 },
  {type:'Business Loan',icon:'💼',rate:12.0,color:'#7c3aed',bg:'#ede9fe',desc:'Business expansion or capital',            min:100000, max:5000000,  minM:12,maxM:120},
];
const lt_color = t => LOAN_TYPES.find(l=>l.type===t)?.color||'#1a3a6b';
const lt_icon  = t => LOAN_TYPES.find(l=>l.type===t)?.icon ||'💳';
const lt_bg    = t => LOAN_TYPES.find(l=>l.type===t)?.bg   ||'#f0f4fb';

const calcEMI = (amount,months,rate) => {
  if(!amount||!months||!rate) return null;
  const ti = Math.round(amount*rate/100*(months/12)*100)/100;
  const tp = amount+ti;
  return {monthly:Math.round(tp/months*100)/100,totalInterest:ti,totalPayable:tp};
};

// ── PDF: single customer ───────────────────────────────────────
const pdfCustomer = (c) => {
  const bal = (c.accounts||[]).reduce((s,a)=>s+(a.balance||0),0);
  const txs = (c.accounts||[]).flatMap(a=>a.transactions||[]);
  const loans= c.loans||[];
  const w = window.open('','_blank');
  if (!w) { alert('Allow popups to download PDF'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Customer ${c.customerNo}</title>
  <style>
    body{font-family:Segoe UI,sans-serif;padding:32px;color:#111;}
    .hdr{background:#1a3a6b;color:white;padding:22px 28px;border-radius:8px;margin-bottom:20px;}
    .hdr h1{font-size:20px;margin:0 0 4px;}.hdr p{margin:0;font-size:12px;opacity:.8;}
    .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
    .card{background:#1a3a6b;color:white;border-radius:6px;padding:12px;text-align:center;}
    .card .lbl{font-size:10px;opacity:.8;margin-bottom:4px;}.card .val{font-size:16px;font-weight:700;}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
    .ib{background:#f8faff;border:1px solid #dde3ec;border-radius:6px;padding:10px 14px;}
    .il{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}
    .iv{font-size:14px;font-weight:700;color:#1a3a6b;}
    h2{font-size:14px;font-weight:700;color:#1a3a6b;border-bottom:2px solid #1a3a6b;padding-bottom:5px;margin:16px 0 10px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    thead tr{background:#1a3a6b;color:white;}
    th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #f1f5f9;}
    tr:nth-child(even) td{background:#f8faff;}
    .foot{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:10px;}
  </style></head><body>
  <div class="hdr">
    <h1>🏛 Bank System — Customer Report</h1>
    <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; CR Number: ${c.customerNo}</p>
  </div>
  <div class="cards">
    <div class="card"><div class="lbl">CR Number</div><div class="val">${c.customerNo}</div></div>
    <div class="card"><div class="lbl">Total Balance</div><div class="val">LKR ${parseFloat(bal).toLocaleString()}</div></div>
    <div class="card"><div class="lbl">Accounts</div><div class="val">${(c.accounts||[]).length}</div></div>
    <div class="card"><div class="lbl">Loans</div><div class="val">${loans.length}</div></div>
  </div>
  <div class="g2">
    <div class="ib"><div class="il">CR Number</div><div class="iv">${c.customerNo}</div></div>
    <div class="ib"><div class="il">Full Name</div><div class="iv">${c.fullName}</div></div>
    <div class="ib"><div class="il">Email</div><div class="iv">${c.email}</div></div>
    <div class="ib"><div class="il">Phone</div><div class="iv">${c.phone||'—'}</div></div>
    <div class="ib"><div class="il">Status</div><div class="iv">${c.status}</div></div>
    <div class="ib"><div class="il">Member Since</div><div class="iv">${new Date(c.createdAt).toLocaleDateString()}</div></div>
  </div>

  <h2>Bank Accounts</h2>
  ${(c.accounts||[]).length
    ? `<table><thead><tr><th>Account No</th><th>Type</th><th>Balance</th><th>Created</th></tr></thead>
      <tbody>${(c.accounts||[]).map(a=>`
        <tr><td>${a.accountNumber}</td><td>${a.accountType}</td>
        <td>LKR ${parseFloat(a.balance||0).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td></tr>
      `).join('')}</tbody></table>`
    : '<p style="color:#94a3b8;font-size:12px">No accounts</p>'}

  <h2>Loans</h2>
  ${loans.length
    ? `<table><thead><tr><th>Loan ID</th><th>Type</th><th>Amount</th><th>Rate</th><th>EMI</th><th>Total Payable</th><th>Status</th><th>Progress</th></tr></thead>
      <tbody>${loans.map(l=>`
        <tr><td>${l.loanNo}</td><td>${l.loanType||'—'}</td>
        <td>LKR ${parseFloat(l.amount||0).toLocaleString()}</td>
        <td>${l.interestRate||'—'}%</td>
        <td>LKR ${parseFloat(l.monthlyPayment||0).toLocaleString()}</td>
        <td>LKR ${parseFloat(l.totalPayable||l.amount||0).toLocaleString()}</td>
        <td>${l.status}</td><td>${l.progress}%</td></tr>
      `).join('')}</tbody></table>`
    : '<p style="color:#94a3b8;font-size:12px">No loans</p>'}

  <h2>Recent Transactions (last 20)</h2>
  ${txs.length
    ? `<table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead>
      <tbody>${txs.slice(0,20).map(t=>`
        <tr><td>${new Date(t.createdAt).toLocaleDateString()}</td>
        <td>${t.type}</td>
        <td>LKR ${parseFloat(t.amount||0).toLocaleString()}</td>
        <td>${t.description}</td></tr>
      `).join('')}</tbody></table>`
    : '<p style="color:#94a3b8;font-size:12px">No transactions</p>'}

  <div class="foot">Bank System &nbsp;|&nbsp; Confidential Customer Report &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

// ── PDF: bulk report ───────────────────────────────────────────
const pdfBulk = (type, data) => {
  const colMap = {
    Customer:   ['CR Number','Name','Email','Phone','Balance','Accounts','Status','Joined'],
    Account:    ['Account No','CR Number','Customer','Type','Balance','Created'],
    Transaction:['ID','Date','Type','CR Number','Customer','Description','Amount'],
    Loan:       ['Loan ID','Type','CR Number','Customer','Amount','Rate%','EMI','Total Payable','Months','Status','Progress'],
  };
  const rowMap = {
    Customer:   data.map(c=>[c.customerNo,c.fullName,c.email,c.phone||'—',`LKR ${(c.balance||0).toLocaleString()}`,c.accountCount||0,c.status,new Date(c.createdAt).toLocaleDateString()]),
    Account:    data.map(a=>[a.accountNumber,a.customerNo||'—',a.customerName,a.accountType,`LKR ${parseFloat(a.balance||0).toLocaleString()}`,new Date(a.createdAt).toLocaleDateString()]),
    Transaction:data.map(t=>['T'+String(t.transactionId).padStart(3,'0'),t.createdAt?.slice(0,10),t.type,t.customerNo||'—',t.customer||'—',t.description,`LKR ${parseFloat(t.amount||0).toLocaleString()}`]),
    Loan:       data.map(l=>[l.loanNo,l.loanType||'—',l.customerNo,l.customerName,`LKR ${parseFloat(l.amount||0).toLocaleString()}`,`${l.interestRate||'—'}%`,`LKR ${parseFloat(l.monthlyPayment||0).toLocaleString()}`,`LKR ${parseFloat(l.totalPayable||l.amount||0).toLocaleString()}`,`${l.months}mo`,l.status,`${l.progress}%`]),
  };
  const w = window.open('','_blank');
  if (!w) { alert('Allow popups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>${type} Report</title>
  <style>body{font-family:Segoe UI,sans-serif;padding:24px;}
  .hdr{background:#1a3a6b;color:white;padding:16px 22px;border-radius:6px;margin-bottom:18px;}
  .hdr h1{font-size:17px;margin:0 0 3px;}.hdr p{margin:0;font-size:11px;opacity:.8;}
  table{width:100%;border-collapse:collapse;font-size:11px;}
  thead tr{background:#1a3a6b;color:white;}
  th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #f1f5f9;}
  tr:nth-child(even) td{background:#f8faff;}
  .foot{margin-top:18px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:8px;}
  </style></head><body>
  <div class="hdr"><h1>🏛 Bank System — ${type} Report</h1>
  <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; ${data.length} records</p></div>
  <table><thead><tr>${colMap[type].map(h=>`<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rowMap[type].map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <div class="foot">Bank System &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
};

// ── Main component ─────────────────────────────────────────────
export default function Dashboard() {
  const [customers,    setCustomers]    = useState([]);
  const [allAccounts,  setAllAccounts]  = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loans,        setLoans]        = useState([]);
  const [recentCusts,  setRecentCusts]  = useState([]);
  const [recentAccs,   setRecentAccs]   = useState([]);
  const [recentTxs,    setRecentTxs]    = useState([]);
  const [auditLogs,    setAuditLogs]    = useState([]);
  const [fraud,        setFraud]        = useState({large:[],suspicious:[],delinquent:[]});
  const [summary,      setSummary]      = useState({totalAccounts:0,totalDeposits:0,totalWithdrawals:0,totalTransactions:0});
  const [loading,      setLoading]      = useState(true);
  const [activeNav,    setActiveNav]    = useState('Dashboard');
  const [modal,        setModal]        = useState(null);
  const [form,         setForm]         = useState({});
  const [toast,        setToast]        = useState({msg:'',type:'ok'});
  const [dd,           setDd]           = useState(null);
  const [search,       setSearch]       = useState('');
  const [statusFil,    setStatusFil]    = useState('All');
  const [page,         setPage]         = useState(1);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [payResult,    setPayResult]    = useState(null);
  const [newCustRes,   setNewCustRes]   = useState(null);
  const [newLoanRes,   setNewLoanRes]   = useState(null);
  const [custSumm,     setCustSumm]     = useState(null);
  const [summLoad,     setSummLoad]     = useState(false);
  const [loanStep,     setLoanStep]     = useState(1);
  const [selType,      setSelType]      = useState(null);
  const [csvFrom,      setCsvFrom]      = useState('');
  const [csvTo,        setCsvTo]        = useState('');
  const [csvTxType,    setCsvTxType]    = useState('');
  const [csvLoanSt,    setCsvLoanSt]    = useState('');

  const navigate = useNavigate();
  const fullName = localStorage.getItem('fullName')||'User';
  const token    = localStorage.getItem('token');
  const role     = localStorage.getItem('role')||'Employee';
  const isAdmin  = role === 'Admin';
  const headers  = { Authorization: `Bearer ${token}` };

  const toast$ = (msg,type='ok') => {
    setToast({msg,type});
    setTimeout(()=>setToast({msg:'',type:'ok'}),4500);
  };
  const openModal = (t,d={}) => {
    setForm(d); setModal(t); setDd(null);
    setPayResult(null); setNewCustRes(null); setNewLoanRes(null);
    setCustSumm(null); setLoanStep(1); setSelType(null);
  };
  const closeModal = () => {
    setModal(null); setForm({}); setPayResult(null);
    setNewCustRes(null); setNewLoanRes(null);
    setCustSumm(null); setLoanStep(1); setSelType(null);
  };

  // ── Load all data ──────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const safe = p => p.catch(e=>{console.warn('API:',getErr(e));return{data:[]};});

      const [cR,tR,lR,aR,rcR,raR,allAccR] = await Promise.all([
        safe(axios.get(`${API}/api/customer`,         {headers})),
        safe(axios.get(`${API}/api/transaction`,      {headers})),
        safe(axios.get(`${API}/api/loan`,             {headers})),
        axios.get(`${API}/api/account/summary`,       {headers}).catch(()=>({data:{totalAccounts:0}})),
        safe(axios.get(`${API}/api/customer/recent`,  {headers})),
        safe(axios.get(`${API}/api/account/recent`,   {headers})),
        safe(axios.get(`${API}/api/account`,          {headers})),
      ]);

      const custs  = Array.isArray(cR.data)       ? cR.data      : [];
      const txs    = Array.isArray(tR.data)       ? tR.data      : [];
      const ls     = Array.isArray(lR.data)       ? lR.data      : [];
      const rcusts = Array.isArray(rcR.data)      ? rcR.data     : [];
      const raccs  = Array.isArray(raR.data)      ? raR.data     : [];
      const allAcc = Array.isArray(allAccR.data)  ? allAccR.data : [];

      setCustomers(custs);
      setTransactions(txs);
      setLoans(ls);
      setRecentCusts(rcusts);
      setRecentAccs(raccs);
      setAllAccounts(allAcc);

      const since = new Date(Date.now()-10*24*60*60*1000);
      setRecentTxs(txs.filter(t=>new Date(t.createdAt)>=since));

      setSummary({
        totalAccounts:    aR.data.totalAccounts??allAcc.length,
        totalDeposits:    txs.filter(t=>t.type==='Deposit').reduce((s,t)=>s+t.amount,0),
        totalWithdrawals: txs.filter(t=>t.type==='Withdrawal').reduce((s,t)=>s+t.amount,0),
        totalTransactions:txs.length,
      });

      if (ls.length>0)
        setSelectedLoan(p=>p?ls.find(l=>l.loanId===p.loanId)||ls[0]:ls[0]);

      if (isAdmin) {
        const [auR,laR,suR,deR] = await Promise.all([
          safe(axios.get(`${API}/api/audit`,                     {headers})),
          safe(axios.get(`${API}/api/fraud/large-transactions`,  {headers})),
          safe(axios.get(`${API}/api/fraud/suspicious-activity`, {headers})),
          safe(axios.get(`${API}/api/fraud/delinquent-loans`,    {headers})),
        ]);
        setAuditLogs(Array.isArray(auR.data)?auR.data:[]);
        setFraud({
          large:      Array.isArray(laR.data?.list)?laR.data.list:[],
          suspicious: Array.isArray(suR.data?.list)?suR.data.list:[],
          delinquent: Array.isArray(deR.data?.list)?deR.data.list:[],
        });
      }
    } catch(e) {
      if (e?.response?.status===401) navigate('/login');
      else toast$('❌ Cannot reach the server. Check the API is running.','err');
    } finally { setLoading(false); }
  },[isAdmin]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const fn=()=>setDd(null);
    document.addEventListener('click',fn);
    return()=>document.removeEventListener('click',fn);
  },[]);

  const filtered = customers.filter(c=>{
    const ms=statusFil==='All'||c.status===statusFil;
    const s=search.toLowerCase();
    const mm=!s||c.fullName?.toLowerCase().includes(s)||c.phone?.includes(s)||c.customerNo?.toLowerCase().includes(s)||c.email?.toLowerCase().includes(s);
    return ms&&mm;
  });
  const totalPg=Math.ceil(filtered.length/PAGE);
  const pageC=filtered.slice((page-1)*PAGE,page*PAGE);
  const findByCR=v=>customers.find(c=>c.customerNo?.toUpperCase()===v?.trim().toUpperCase()||String(c.customerId)===v?.trim());

  const loadCustSumm=async cr=>{
    if(!cr?.trim()){setCustSumm(null);return;}
    setSummLoad(true);
    try{const r=await axios.get(`${API}/api/customer/by-crno/${cr.trim().toUpperCase()}`,{headers});setCustSumm(r.data);}
    catch(e){toast$('❌ '+getErr(e),'err');}
    finally{setSummLoad(false);}
  };

  const doNewCustomer=async()=>{
    if(!form.name?.trim()||!form.email?.trim()){toast$('❌ Name and email required','err');return;}
    try{const r=await axios.post(`${API}/api/customer`,{fullName:form.name.trim(),email:form.email.trim(),phone:form.phone||''},{headers});setNewCustRes(r.data);load();}
    catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const doNewAccount=async()=>{
    if(!form.type||!form.crNo?.trim()){toast$('❌ All fields required','err');return;}
    const c=findByCR(form.crNo);
    if(!c){toast$('❌ Customer not found — check the CR number','err');return;}
    try{await axios.post(`${API}/api/account/create`,{accountType:form.type,customerId:c.customerId},{headers});toast$('✅ Account created');closeModal();load();}
    catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const doNewTx=async()=>{
    if(!form.type||!form.amount||!form.crNo?.trim()){toast$('❌ All fields required','err');return;}
    const amt=parseFloat(String(form.amount).trim());
    if(isNaN(amt)||amt<=0){toast$('❌ Enter a valid amount','err');return;}
    const c=findByCR(form.crNo);
    if(!c){toast$('❌ Customer not found','err');return;}
    if(!c.accounts?.length){toast$('❌ Customer has no account','err');return;}
    try{
      const ep=form.type==='Deposit'?'deposit':'withdraw';
      await axios.post(`${API}/api/transaction/${ep}`,{accountId:c.accounts[0].accountId,amount:amt,description:form.desc||form.type},{headers});
      toast$('✅ Transaction recorded');closeModal();load();
    }catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const doNewLoan=async()=>{
    if(!form.crNo?.trim()||!form.amount||!selType){toast$('❌ Fill all required fields','err');return;}
    const c=findByCR(form.crNo);
    if(!c){toast$('❌ Customer not found','err');return;}
    try{
      const r=await axios.post(`${API}/api/loan/apply`,{customerId:c.customerId,loanType:selType.type,amount:parseFloat(form.amount),months:parseInt(form.months||selType.minM)},{headers});
      setNewLoanRes(r.data);load();
    }catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const doApprove=async id=>{
    if(!isAdmin){toast$('❌ Only Admin can approve loans','err');return;}
    try{await axios.put(`${API}/api/loan/${id}/approve`,{},{headers});toast$('✅ Loan approved');load();}
    catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const doReject=async id=>{
    if(!isAdmin){toast$('❌ Only Admin can reject loans','err');return;}
    const reason=window.prompt('Enter rejection reason:');
    if(!reason)return;
    try{await axios.put(`${API}/api/loan/${id}/reject`,JSON.stringify(reason),{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});toast$('🚫 Loan rejected');load();}
    catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const doPayEmi=async()=>{
    const loanNo=form.emiLoanNo?.trim().toUpperCase();
    const crNo=form.emiCrNo?.trim().toUpperCase();
    const amt=parseFloat(String(form.emiAmount||'').trim());
    if(!loanNo){toast$('❌ Enter Loan ID','err');return;}
    if(!crNo){toast$('❌ Enter CR Number','err');return;}
    if(!amt||amt<=0){toast$('❌ Enter valid amount','err');return;}
    try{
      const r=await axios.post(`${API}/api/loan/pay-emi`,{loanNo,customerNo:crNo,amount:amt,note:form.emiNote||''},{headers});
      setPayResult(r.data);
      toast$(`✅ EMI paid! New balance: LKR ${fmtN(r.data.newBalance)}`);
      setForm(f=>({...f,emiAmount:'',emiNote:''}));
      load();
    }catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const doDelete=async id=>{
    if(!isAdmin){toast$('❌ Only Admin can delete','err');return;}
    if(!window.confirm('Delete this customer and all their data?'))return;
    try{await axios.delete(`${API}/api/customer/${id}`,{headers});toast$('🗑 Customer deleted');load();}
    catch(e){toast$('❌ '+getErr(e),'err');}
  };

  // ✅ Fixed PDF download — loads customer with full data
  const doPDF=async id=>{
    try{
      const r=await axios.get(`${API}/api/customer/${id}`,{headers});
      if(!r.data){toast$('❌ Customer data is empty','err');return;}
      pdfCustomer(r.data);
    }catch(e){
      console.error('PDF error:',e);
      toast$('❌ PDF failed: '+getErr(e),'err');
    }
  };

  const exportCSV=async type=>{
    try{
      let url=`${API}/api/${type.toLowerCase()}/export/csv`;
      const p=new URLSearchParams();
      if(type==='Transaction'){if(csvFrom)p.append('from',csvFrom);if(csvTo)p.append('to',csvTo);if(csvTxType)p.append('type',csvTxType);}
      if(type==='Loan'&&csvLoanSt)p.append('status',csvLoanSt);
      if([...p].length)url+='?'+p.toString();
      const r=await axios.get(url,{headers,responseType:'blob'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(r.data);
      a.download=`${type.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      toast$(`✅ ${type} CSV exported`);
    }catch(e){toast$('❌ '+getErr(e),'err');}
  };

  const activeLoan=selectedLoan||loans[0];
  const emiPreview=selType&&form.amount&&form.months?calcEMI(parseFloat(form.amount),parseInt(form.months),selType.rate):null;
  const totalAlerts=fraud.large.length+fraud.suspicious.length+fraud.delinquent.length;
  const navItems=[
    {label:'Dashboard',icon:'⊞'},
    {label:'Customer', icon:'👤'},
    {label:'Account',  icon:'🏦'},
    {label:'Transaction',icon:'⇄'},
    {label:'Loan',     icon:'💳'},
    {label:'Reports',  icon:'🖨'},
    ...(isAdmin?[{label:'Audit Log',icon:'📋'},{label:'Fraud Alerts',icon:'🚨',badge:totalAlerts}]:[]),
  ];
  const logout=()=>{localStorage.clear();navigate('/login');};

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',sans-serif;background:#eef2f7;}
        .root{display:flex;min-height:100vh;}
        .side{width:215px;background:#1a3a6b;flex-shrink:0;display:flex;flex-direction:column;}
        .slogo{padding:20px 18px;display:flex;align-items:center;gap:11px;border-bottom:1px solid rgba(255,255,255,.12);}
        .slogo-i{width:38px;height:38px;background:white;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;}
        .slogo-t{font-size:15px;font-weight:800;color:white;line-height:1.3;}
        .snav{flex:1;padding:8px 0;}
        .nb{width:100%;display:flex;align-items:center;justify-content:space-between;padding:11px 17px;background:none;border:none;color:rgba(255,255,255,.7);font-size:13.5px;font-weight:500;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;border-left:3px solid transparent;transition:background .14s;}
        .nb .nl{display:flex;align-items:center;gap:9px;}
        .nb:hover{background:rgba(255,255,255,.08);color:white;}
        .nb.act{background:#2c5aa0;color:white;border-left-color:white;}
        .nbadge{background:#dc2626;color:white;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;min-width:18px;text-align:center;}
        .sfoot{padding:13px 17px;border-top:1px solid rgba(255,255,255,.12);}
        .srole{font-size:11px;font-weight:700;padding:2px 9px;border-radius:6px;display:inline-block;margin-bottom:5px;}
        .srole.Admin{background:#fef3c7;color:#b45309;}.srole.Employee{background:#e0f2fe;color:#0369a1;}
        .suser{font-size:11px;color:rgba(255,255,255,.45);margin-bottom:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .lgout{width:100%;padding:7px;background:rgba(255,255,255,.1);border:none;border-radius:6px;color:rgba(255,255,255,.75);font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;}
        .lgout:hover{background:rgba(255,255,255,.18);}
        .main{flex:1;display:flex;flex-direction:column;min-width:0;}
        .tbar{background:white;border-bottom:1px solid #dde3ec;padding:12px 22px;display:flex;align-items:center;justify-content:space-between;}
        .tbar-t{font-size:19px;font-weight:800;color:#1a3a6b;}
        .tbar-r{display:flex;align-items:center;gap:10px;}
        .av{width:34px;height:34px;border-radius:50%;background:#2c5aa0;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;}
        .rp{font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px;}
        .rp.Admin{background:#fef3c7;color:#b45309;}.rp.Employee{background:#e0f2fe;color:#0369a1;}
        .cnt{flex:1;padding:18px 20px 32px;overflow-y:auto;}
        .qg{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:16px;}
        .qc{background:white;border-radius:10px;padding:14px 15px;border:1px solid #dde3ec;}
        .qt{display:flex;align-items:center;gap:10px;margin-bottom:11px;}
        .qi{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .qi.bl{background:#e8f0fb;}.qi.nv{background:#e8ecf5;}.qi.tl{background:#e6f4f1;}.qi.gn{background:#e8f5e9;}
        .ql{font-size:12px;font-weight:600;color:#1a3a6b;}
        .ddw{position:relative;}
        .ddb{display:flex;align-items:center;gap:5px;padding:7px 12px;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;color:white;white-space:nowrap;}
        .ddb.bl{background:#2c5aa0;}.ddb.nv{background:#1a3a6b;}.ddb.tl{background:#2e7d6e;}.ddb.gn{background:#2e7d32;}
        .ddb:hover{opacity:.88;}
        .ddm{position:absolute;top:calc(100% + 4px);left:0;z-index:400;background:white;border:1px solid #dde3ec;border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:195px;overflow:hidden;}
        .ddi{display:block;width:100%;padding:10px 14px;background:none;border:none;text-align:left;font-size:13px;color:#374151;cursor:pointer;font-family:'Inter',sans-serif;}
        .ddi:hover{background:#f0f4ff;color:#1a3a6b;}
        .ddi.dim{color:#94a3b8;cursor:default;}
        .rg{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:14px;}
        .rb{background:white;border-radius:10px;border:1px solid #dde3ec;overflow:hidden;}
        .rh{background:#1a3a6b;color:white;padding:9px 13px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;}
        .rbg{background:rgba(255,255,255,.22);padding:1px 7px;border-radius:8px;font-size:11px;}
        .ri{display:flex;justify-content:space-between;align-items:center;padding:8px 13px;border-bottom:1px solid #f1f5f9;font-size:12px;}
        .ri:last-child{border-bottom:none;}
        .rin{font-weight:500;color:#1a3a6b;}.ris{color:#64748b;font-size:11px;margin-top:1px;}.riv{font-weight:600;color:#2c5aa0;font-size:12px;}
        .nr{text-align:center;color:#94a3b8;padding:16px;font-size:12px;}
        .card{background:white;border-radius:10px;border:1px solid #dde3ec;overflow:hidden;margin-bottom:13px;}
        .ct{font-size:13.5px;font-weight:700;color:#1a3a6b;padding:11px 15px;border-bottom:1px solid #f0f4f8;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
        .cbg{font-size:11px;font-weight:700;background:#1a3a6b;color:white;padding:2px 8px;border-radius:10px;}
        .sb-bar{display:flex;gap:7px;align-items:center;padding:9px 14px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;}
        .si{flex:1;min-width:140px;padding:8px 11px;border:1.5px solid #dde3ec;border-radius:7px;font-size:13px;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;outline:none;}
        .si:focus{border-color:#2c5aa0;}
        .ss{padding:8px 9px;border:1.5px solid #dde3ec;border-radius:7px;font-size:13px;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;outline:none;}
        .sc{padding:7px 12px;background:#f1f5f9;color:#64748b;border:1px solid #dde3ec;border-radius:7px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;}
        .csv-btn{padding:6px 12px;background:#16a34a;color:white;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
        .csv-btn:hover{background:#15803d;}
        .tbl{width:100%;border-collapse:collapse;}
        .tbl thead tr{background:#2c5aa0;}
        .tbl th{padding:9px 12px;text-align:left;font-size:12px;font-weight:600;color:white;white-space:nowrap;}
        .tbl td{padding:9px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f1f5f9;}
        .tbl tr:last-child td{border-bottom:none;}.tbl tr:hover td{background:#f8faff;}
        .ec{text-align:center;color:#94a3b8;padding:22px!important;font-size:13px;}
        .cr{display:inline-block;background:#1a3a6b;color:white;font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;font-family:monospace;letter-spacing:.03em;}
        .cr.loan{background:#b45309;}
        .bdg{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
        .ba{background:#dcfce7;color:#15803d;}.bi{background:#fee2e2;color:#b91c1c;}.bp{background:#fef3c7;color:#b45309;}.bc{background:#e0f2fe;color:#0369a1;}.br{background:#fee2e2;color:#b91c1c;}
        .bd{background:#dcfce7;color:#15803d;}.bw{background:#fee2e2;color:#b91c1c;}.bt{background:#ede9fe;color:#6d28d9;}
        .lt-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
        .tb{padding:3px 7px;border-radius:4px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-left:2px;}
        .tb.pdf{background:#f0fdf4;color:#16a34a;}.tb.del{background:#fef2f2;color:#dc2626;}.tb.apr{background:#eff6ff;color:#1a56db;}.tb.rej{background:#fef2f2;color:#dc2626;}
        .balcell{font-weight:700;color:#1a3a6b;}.balcell.low{color:#dc2626;}
        .pgn{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;}
        .pbs{display:flex;gap:3px;}
        .pb{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:5px;border:1px solid #dde3ec;background:white;font-size:12px;color:#374151;cursor:pointer;font-family:'Inter',sans-serif;}
        .pb.act{background:#1a3a6b;color:white;border-color:#1a3a6b;}
        .mg{display:grid;grid-template-columns:1fr 270px;gap:12px;margin-bottom:12px;}
        .bg{display:grid;grid-template-columns:1fr 1fr 260px;gap:12px;}
        .ri2{display:flex;align-items:center;justify-content:space-between;padding:10px 15px;border-bottom:1px solid #f1f5f9;}
        .ri2:last-child{border-bottom:none;}
        .rl{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500;color:#1a3a6b;}
        .rv{font-size:16px;font-weight:700;color:#e53e3e;}
        .lr{display:flex;justify-content:space-between;align-items:center;padding:8px 15px;border-bottom:1px solid #f1f5f9;}
        .lk{font-size:12px;color:#64748b;}.lv{font-size:13px;font-weight:700;color:#1a3a6b;}
        .prw{padding:7px 15px 3px;}
        .prt{height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden;}
        .prf{height:100%;border-radius:4px;transition:width .5s;}
        .prl{font-size:10px;color:#64748b;text-align:right;padding:2px 0 6px;}
        .lsel{display:flex;gap:5px;flex-wrap:wrap;padding:7px 15px;border-bottom:1px solid #f1f5f9;}
        .lpil{padding:3px 9px;border-radius:11px;border:1.5px solid #2c5aa0;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
        .lpil.s{background:#1a3a6b;color:white;border-color:#1a3a6b;}.lpil:not(.s){background:white;color:#2c5aa0;}
        .ps{padding:12px 15px;border-top:2px solid #1a3a6b;background:#f0f4fb;}
        .pt{font-size:13px;font-weight:700;color:#1a3a6b;margin-bottom:8px;}
        .pinp{width:100%;padding:8px 11px;border:1.5px solid #2c5aa0;border-radius:7px;font-size:13px;font-weight:600;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;outline:none;margin-bottom:7px;}
        .pinp:focus{border-color:#1a56db;box-shadow:0 0 0 3px rgba(44,90,160,.1);}
        .pinp::placeholder{color:#94a3b8;font-weight:400;}
        .pr2{display:flex;gap:7px;align-items:center;margin-bottom:7px;}
        .pbtn{padding:8px 14px;background:#1a3a6b;color:white;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;}
        .pbtn:hover{background:#2c5aa0;}
        .phint{font-size:11px;color:#64748b;margin-top:3px;}
        .pres{margin-top:8px;padding:10px 12px;background:#dcfce7;border-radius:7px;border:1px solid #bbf7d0;}
        .prr{display:flex;justify-content:space-between;font-size:12px;color:#15803d;margin-bottom:3px;}.prr:last-child{margin-bottom:0;font-weight:700;}
        .prc{margin-top:5px;text-align:center;font-weight:700;color:#15803d;font-size:13px;}
        .eh{padding:8px 15px;font-size:11px;font-weight:700;color:#1a3a6b;background:#f8faff;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;text-transform:uppercase;letter-spacing:.04em;}
        .er{display:flex;justify-content:space-between;align-items:center;padding:7px 15px;border-bottom:1px solid #f1f5f9;font-size:11px;}
        .er:last-child{border-bottom:none;}
        .ep{color:#16a34a;font-weight:700;font-size:10px;background:#dcfce7;padding:2px 6px;border-radius:4px;}
        .sg{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:11px;}
        .sb2{border-radius:8px;padding:11px 13px;color:white;}
        .sb2.bl{background:#2c5aa0;}.sb2.nv{background:#1a3a6b;}.sb2.gn{background:#2e7d32;}.sb2.rd{background:#c0392b;}
        .sl{font-size:11px;opacity:.9;margin-bottom:4px;}.sv{font-size:17px;font-weight:700;}
        .txm{border-top:1px solid #f1f5f9;}
        .txh{padding:9px 12px;font-size:13px;font-weight:600;color:#1a3a6b;border-bottom:1px solid #f1f5f9;}
        .txr{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-bottom:1px solid #f8faff;font-size:12px;}
        .txr:last-child{border:none;}
        .rpg{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:11px;}
        .rpb{background:#f8faff;border:1px solid #dde3ec;border-radius:8px;padding:10px;text-align:center;}
        .rpi{font-size:20px;margin-bottom:4px;}.rpn{font-size:11px;font-weight:600;color:#1a3a6b;margin-bottom:5px;}
        .rpbtn{width:100%;padding:6px 0;background:#1a3a6b;color:white;border:none;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-bottom:4px;}
        .rpbtn:hover{background:#2c5aa0;}
        .lss{border-top:1px solid #f1f5f9;padding:10px 12px;}
        .lsh{font-size:12.5px;font-weight:700;color:#1a3a6b;margin-bottom:6px;}
        .lsr{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;}
        .audit-row{display:grid;grid-template-columns:auto 1fr 1fr 1fr 2fr;gap:8px;padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;align-items:center;}
        .audit-row:last-child{border-bottom:none;}
        .fraud-item{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid #fee2e2;font-size:12px;flex-wrap:wrap;gap:6px;}
        .fraud-item:last-child{border-bottom:none;}
        .lt-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
        .lt-card{border:2px solid #e2e8f0;border-radius:12px;padding:14px 12px;cursor:pointer;transition:all .2s;background:white;}
        .lt-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1);}
        .lt-icon{font-size:27px;margin-bottom:6px;}.lt-name{font-size:13px;font-weight:700;color:#1a3a6b;margin-bottom:3px;}
        .lt-desc{font-size:11px;color:#64748b;margin-bottom:6px;}
        .lt-rate{font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-block;}
        .lt-range{font-size:10px;color:#94a3b8;margin-top:4px;}
        .emi-calc{border-radius:10px;padding:12px 14px;margin-bottom:12px;}
        .emi-calc-t{font-size:12px;font-weight:700;margin-bottom:8px;}
        .emi-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;}
        .emi-row.tot{border-top:1px solid rgba(0,0,0,.1);margin-top:6px;padding-top:6px;font-weight:700;}
        .csbox{background:#f0f4fb;border-radius:8px;padding:12px;margin-top:10px;border:1px solid #dde3ec;}
        .csbox-t{font-size:12px;font-weight:700;color:#1a3a6b;margin-bottom:8px;}
        .csgrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
        .csitem{background:white;border-radius:6px;padding:8px 10px;border:1px solid #e2e8f0;}
        .csitem-l{font-size:10px;color:#64748b;margin-bottom:2px;}.csitem-v{font-size:13px;font-weight:700;color:#1a3a6b;}
        .step-hd{display:flex;align-items:center;gap:8px;margin-bottom:13px;}
        .step-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
        .step-dot.act{background:#1a3a6b;color:white;}.step-dot.done{background:#15803d;color:white;}.step-dot.wait{background:#e2e8f0;color:#94a3b8;}
        .step-line{flex:1;height:2px;background:#e2e8f0;}
        .ovl{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(2px);}
        .mdl{background:white;border-radius:13px;padding:26px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;animation:mup .2s ease;}
        @keyframes mup{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        .mtt{font-size:16px;font-weight:800;color:#1a3a6b;margin-bottom:16px;}
        .ml{font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;display:block;text-transform:uppercase;letter-spacing:.06em;}
        .mi,.ms{width:100%;padding:9px 11px;border:1.5px solid #dde3ec;border-radius:8px;font-size:14px;color:#1e293b;background:#f8fafc;font-family:'Inter',sans-serif;margin-bottom:11px;outline:none;transition:border-color .15s;}
        .mi:focus,.ms:focus{border-color:#2c5aa0;background:white;}
        .mf{display:flex;gap:9px;margin-top:6px;}
        .mb{flex:1;padding:10px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
        .mb.p{background:#1a3a6b;color:white;}.mb.p:hover{background:#2c5aa0;}.mb.c{background:#f1f5f9;color:#64748b;}
        .note{background:#eff6ff;border-radius:8px;padding:9px 13px;margin-bottom:11px;font-size:13px;color:#1e40af;line-height:1.5;}
        .suc{background:#dcfce7;border:1px solid #bbf7d0;border-radius:9px;padding:16px;margin-bottom:14px;text-align:center;}
        .suc-t{font-size:13px;font-weight:700;color:#15803d;margin-bottom:8px;}
        .suc-id{font-size:20px;font-weight:800;color:#1a3a6b;font-family:monospace;background:white;border:2px solid #2c5aa0;border-radius:8px;padding:8px 18px;display:inline-block;margin-bottom:6px;letter-spacing:2px;}
        .suc-s{font-size:12px;color:#64748b;margin-top:3px;}
        .tst{position:fixed;bottom:22px;right:22px;z-index:9999;padding:11px 16px;border-radius:9px;font-size:13px;font-weight:500;box-shadow:0 8px 28px rgba(0,0,0,.18);max-width:380px;animation:tin .22s ease;}
        .tst.ok{background:#1a3a6b;color:white;}.tst.err{background:#b91c1c;color:white;}
        @keyframes tin{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        .ls2{position:fixed;inset:0;background:rgba(238,242,247,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9998;gap:13px;}
        .sp{width:36px;height:36px;border:4px solid #dde3ec;border-top-color:#2c5aa0;border-radius:50%;animation:spin .75s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#c8d0dc;border-radius:3px;}
      `}</style>

      {loading&&<div className="ls2"><div className="sp"/><div style={{fontSize:14,color:'#64748b',fontWeight:500}}>Loading Bank System...</div></div>}

      <div className="root">
        <aside className="side">
          <div className="slogo"><div className="slogo-i">🏛</div><div className="slogo-t">Bank<br/>System</div></div>
          <nav className="snav">
            {navItems.map(n=>(
              <button key={n.label} className={`nb ${activeNav===n.label?'act':''}`} onClick={()=>setActiveNav(n.label)}>
                <span className="nl"><span>{n.icon}</span>{n.label}</span>
                {n.badge>0&&<span className="nbadge">{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sfoot">
            <div><span className={`srole ${role}`}>{role}</span></div>
            <div className="suser">{fullName}</div>
            <button className="lgout" onClick={logout}>⎋ &nbsp;Logout</button>
          </div>
        </aside>

        <div className="main">
          <div className="tbar">
            <div className="tbar-t">Bank System</div>
            <div className="tbar-r">
              <span className={`rp ${role}`}>{role}</span>
              <div className="av">{fullName.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}</div>
              <span style={{fontSize:13,color:'#64748b'}}>{fullName}</span>
            </div>
          </div>

          <div className="cnt">
            {/* Quick cards */}
            <div className="qg">
              {[
                {key:'cust',cls:'bl',icon:'👤',title:'Customer Registration',label:'Add Customer ▾',
                  items:[{t:'➕ Add New Customer',fn:()=>openModal('customer')},{t:'👥 View All Customers',fn:()=>setActiveNav('Customer')},{t:'🔍 Customer Summary',fn:()=>openModal('summary')}]},
                {key:'acc', cls:'nv',icon:'🏦',title:'Account Creation',label:'Create Account ▾',
                  items:[{t:'➕ Create Account',fn:()=>openModal('account')},{t:'📋 View Accounts',fn:()=>setActiveNav('Account')}]},
                {key:'tx',  cls:'tl',icon:'⇄', title:'Transactions',label:'New Transaction ▾',
                  items:[{t:'➕ New Transaction',fn:()=>openModal('transaction')},{t:'📋 All Transactions',fn:()=>setActiveNav('Transaction')}]},
                {key:'loan',cls:'gn',icon:'💳',title:'Loan Management',label:'Manage Loans ▾',
                  items:[
                    {t:'➕ Apply for Loan',fn:()=>openModal('loan')},
                    {t:'💳 Pay EMI',fn:()=>openModal('payemi')},
                    {t:'📋 View All Loans',fn:()=>setActiveNav('Loan')},
                    ...(isAdmin
                      ?loans.filter(l=>l.status==='Pending').map(l=>({t:`✅ Approve: ${l.loanNo}`,fn:()=>doApprove(l.loanId)}))
                      :[{t:'ℹ️ Admin approves loans',fn:null,dim:true}]
                    ),
                  ]},
              ].map(q=>(
                <div key={q.key} className="qc">
                  <div className="qt"><div className={`qi ${q.cls}`}>{q.icon}</div><div className="ql">{q.title}</div></div>
                  <div className="ddw" onClick={e=>e.stopPropagation()}>
                    <button className={`ddb ${q.cls}`} onClick={()=>setDd(dd===q.key?null:q.key)}>{q.label}</button>
                    {dd===q.key&&<div className="ddm">{q.items.map((it,i)=><button key={i} className={`ddi ${it.dim?'dim':''}`} onClick={it.fn&&!it.dim?it.fn:undefined}>{it.t}</button>)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Fraud banner */}
            {isAdmin&&totalAlerts>0&&(
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'11px 15px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontWeight:700,color:'#b91c1c',fontSize:13}}>🚨 {totalAlerts} Fraud Alert{totalAlerts>1?'s':''} detected</span>
                <button onClick={()=>setActiveNav('Fraud Alerts')} style={{padding:'5px 13px',background:'#b91c1c',color:'white',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>View Alerts</button>
              </div>
            )}

            {/* Recent boxes */}
            <div className="rg">
              <div className="rb">
                <div className="rh">🆕 Recent Customers (10 days)<span className="rbg">{recentCusts.length}</span></div>
                {recentCusts.length===0?<div className="nr">No new customers in last 10 days</div>
                :recentCusts.slice(0,5).map(c=>(
                  <div key={c.customerId} className="ri">
                    <div><div className="rin">{c.fullName}</div><div className="ris">{c.phone||c.email}</div></div>
                    <span className="cr">{c.customerNo}</span>
                  </div>
                ))}
              </div>
              <div className="rb">
                <div className="rh">🆕 Recent Accounts (10 days)<span className="rbg">{recentAccs.length}</span></div>
                {recentAccs.length===0?<div className="nr">No new accounts in last 10 days</div>
                :recentAccs.slice(0,5).map((a,i)=>(
                  <div key={i} className="ri">
                    <div><div className="rin">{a.accountType}</div><div className="ris">{a.customerName} | {a.customerNo}</div></div>
                    <span className="riv">LKR {fmtN(a.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="rb">
                <div className="rh">🆕 Recent Transactions (10 days)<span className="rbg">{recentTxs.length}</span></div>
                {recentTxs.length===0?<div className="nr">No recent transactions in last 10 days</div>
                :recentTxs.slice(0,5).map(t=>{
                  const p=t.type==='Deposit'||t.type==='Transfer In';
                  return <div key={t.transactionId} className="ri">
                    <div><div className="rin">{t.description||t.type}</div><div className="ris">{t.createdAt?.slice(0,10)} | {t.customerNo||''}</div></div>
                    <span style={{fontWeight:600,color:p?'#16a34a':'#dc2626',fontSize:12}}>{p?'+':'−'}LKR {fmtN(t.amount)}</span>
                  </div>;
                })}
              </div>
            </div>

            {/* Customer table */}
            {(activeNav==='Dashboard'||activeNav==='Customer')&&(
              <div className="card">
                <div className="ct">Customer List<span className="cbg">{filtered.length}</span></div>
                <div className="sb-bar">
                  <input className="si" placeholder="Search by name, phone, or CR number..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
                  <select className="ss" value={statusFil} onChange={e=>{setStatusFil(e.target.value);setPage(1);}}>
                    <option value="All">All Status</option><option>Active</option><option>Inactive</option>
                  </select>
                  <button className="sc" onClick={()=>{setSearch('');setStatusFil('All');setPage(1);}}>Clear</button>
                  {isAdmin&&<button className="csv-btn" onClick={()=>exportCSV('Customer')}>📥 CSV</button>}
                </div>
                <table className="tbl">
                  <thead><tr><th>CR Number</th><th>Name</th><th>Email</th><th>Phone</th><th>Balance</th><th>Accounts</th><th>Loans</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pageC.length===0?<tr><td colSpan={10} className="ec">No customers found</td></tr>
                    :pageC.map(c=>(
                      <tr key={c.customerId}>
                        <td><span className="cr">{c.customerNo}</span></td>
                        <td style={{fontWeight:500}}>{c.fullName}</td>
                        <td style={{color:'#64748b',fontSize:11}}>{c.email}</td>
                        <td>{c.phone||'—'}</td>
                        <td><span className={`balcell ${(c.balance||0)<1000?'low':''}`}>LKR {fmt(c.balance)}</span></td>
                        <td style={{textAlign:'center'}}>{c.accountCount||0}</td>
                        <td style={{textAlign:'center'}}>{c.totalLoans||0}</td>
                        <td><span className={`bdg ${c.status==='Active'?'ba':'bi'}`}>{c.status}</span></td>
                        <td style={{color:'#64748b',fontSize:11}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button className="tb pdf" onClick={()=>doPDF(c.customerId)}>🖨 PDF</button>
                          {isAdmin&&<button className="tb del" onClick={()=>doDelete(c.customerId)}>Delete</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pgn">
                  <span>Showing {filtered.length===0?0:(page-1)*PAGE+1}–{Math.min(page*PAGE,filtered.length)} of {filtered.length}</span>
                  <div className="pbs">
                    <button className="pb" onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
                    {Array.from({length:Math.min(5,totalPg)},(_,i)=>i+1).map(p=>(
                      <button key={p} className={`pb ${page===p?'act':''}`} onClick={()=>setPage(p)}>{p}</button>
                    ))}
                    <button className="pb" onClick={()=>setPage(p=>Math.min(totalPg,p+1))}>›</button>
                  </div>
                </div>
              </div>
            )}

            {activeNav==='Account'&&(
              <div className="card">
                <div className="ct">All Accounts<span className="cbg">{allAccounts.length}</span></div>
                <table className="tbl">
                  <thead><tr><th>Account No</th><th>CR Number</th><th>Customer</th><th>Type</th><th>Balance</th><th>Created</th></tr></thead>
                  <tbody>
                    {allAccounts.length===0?<tr><td colSpan={6} className="ec">No accounts</td></tr>
                    :allAccounts.map(a=>(
                      <tr key={a.accountId}>
                        <td style={{fontFamily:'monospace',fontWeight:600}}>{a.accountNumber}</td>
                        <td><span className="cr">{a.customerNo}</span></td>
                        <td>{a.customerName}</td><td>{a.accountType}</td>
                        <td><span className="balcell">LKR {fmt(a.balance)}</span></td>
                        <td style={{color:'#64748b',fontSize:11}}>{new Date(a.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeNav==='Transaction'&&(
              <div className="card">
                <div className="ct">
                  All Transactions<span className="cbg">{transactions.length}</span>
                  {isAdmin&&<div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                    <input type="date" value={csvFrom} onChange={e=>setCsvFrom(e.target.value)} style={{padding:'4px 7px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}}/>
                    <input type="date" value={csvTo}   onChange={e=>setCsvTo(e.target.value)}   style={{padding:'4px 7px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}}/>
                    <select value={csvTxType} onChange={e=>setCsvTxType(e.target.value)} style={{padding:'4px 7px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}}>
                      <option value="">All Types</option><option>Deposit</option><option>Withdrawal</option>
                    </select>
                    <button className="csv-btn" onClick={()=>exportCSV('Transaction')}>📥 CSV</button>
                  </div>}
                </div>
                <table className="tbl">
                  <thead><tr><th>ID</th><th>Type</th><th>CR Number</th><th>Customer</th><th>Description</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>
                    {transactions.length===0?<tr><td colSpan={7} className="ec">No transactions</td></tr>
                    :transactions.slice(0,50).map(t=>{
                      const p=t.type==='Deposit'||t.type==='Transfer In';
                      const cl=t.type==='Deposit'?'bd':t.type?.includes('Transfer')?'bt':'bw';
                      return <tr key={t.transactionId}>
                        <td>T{String(t.transactionId).padStart(3,'0')}</td>
                        <td><span className={`bdg ${cl}`}>{t.type}</span></td>
                        <td><span className="cr">{t.customerNo||'—'}</span></td>
                        <td>{t.customer||'—'}</td>
                        <td style={{color:'#64748b'}}>{t.description}</td>
                        <td style={{fontWeight:600,color:p?'#16a34a':'#dc2626'}}>{p?'+':'−'}LKR {fmtN(t.amount)}</td>
                        <td style={{color:'#64748b'}}>{t.createdAt?.slice(0,10)}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeNav==='Loan'&&(
              <div className="card">
                <div className="ct">
                  All Loans<span className="cbg">{loans.length}</span>
                  {isAdmin&&<div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <select value={csvLoanSt} onChange={e=>setCsvLoanSt(e.target.value)} style={{padding:'4px 7px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}}>
                      <option value="">All Status</option><option>Pending</option><option>Active</option><option>Completed</option><option>Rejected</option>
                    </select>
                    <button className="csv-btn" onClick={()=>exportCSV('Loan')}>📥 CSV</button>
                  </div>}
                </div>
                <table className="tbl">
                  <thead><tr><th>Loan ID</th><th>Type</th><th>CR Number</th><th>Customer</th><th>Amount</th><th>Rate</th><th>Monthly EMI</th><th>Total Payable</th><th>Months</th><th>Status</th><th>Progress</th><th>Actions</th></tr></thead>
                  <tbody>
                    {loans.length===0?<tr><td colSpan={12} className="ec">No loans found</td></tr>
                    :loans.map(l=>{
                      const lt2=LOAN_TYPES.find(x=>x.type===l.loanType)||LOAN_TYPES[0];
                      return <tr key={l.loanId}>
                        <td><span className="cr loan">{l.loanNo}</span></td>
                        <td><span className="lt-badge" style={{background:lt2.bg,color:lt2.color}}>{lt2.icon} {l.loanType}</span></td>
                        <td><span className="cr">{l.customerNo}</span></td>
                        <td style={{fontWeight:500}}>{l.customerName}</td>
                        <td>LKR {fmtN(l.amount)}</td>
                        <td style={{fontWeight:600,color:lt2.color}}>{l.interestRate}%</td>
                        <td>LKR {fmtN(l.monthlyPayment)}</td>
                        <td style={{fontWeight:600}}>LKR {fmtN(l.totalPayable||l.amount)}</td>
                        <td>{l.months}mo</td>
                        <td><span className={`bdg ${l.status==='Active'?'ba':l.status==='Pending'?'bp':l.status==='Rejected'?'br':'bc'}`}>{l.status}</span></td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <div style={{flex:1,height:5,background:'#e2e8f0',borderRadius:3,overflow:'hidden',minWidth:40}}>
                              <div style={{height:'100%',width:`${l.progress}%`,background:lt2.color,borderRadius:3}}/>
                            </div>
                            <span style={{fontSize:11,color:'#64748b'}}>{l.progress}%</span>
                          </div>
                        </td>
                        <td>
                          {isAdmin&&l.status==='Pending'&&<><button className="tb apr" onClick={()=>doApprove(l.loanId)}>Approve</button><button className="tb rej" onClick={()=>doReject(l.loanId)}>Reject</button></>}
                          {!isAdmin&&l.status==='Pending'&&<span style={{fontSize:10,color:'#94a3b8'}}>Awaiting Admin</span>}
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeNav==='Audit Log'&&isAdmin&&(
              <div className="card">
                <div className="ct">Audit Log<span className="cbg">{auditLogs.length}</span></div>
                {auditLogs.length===0?<div className="nr">No audit logs yet</div>
                :auditLogs.map(a=>(
                  <div key={a.auditId} className="audit-row">
                    <span style={{color:'#64748b',fontSize:11,whiteSpace:'nowrap'}}>{new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                    <span style={{fontWeight:600,color:'#1a3a6b'}}>{a.action}</span>
                    <span><span className="cr" style={{fontSize:10}}>{a.entityId}</span></span>
                    <span style={{fontSize:11}}><span className={`rp ${a.userRole}`} style={{fontSize:10}}>{a.userRole}</span> {a.performedBy}</span>
                    <span style={{color:'#64748b',fontSize:11}}>{a.details}</span>
                  </div>
                ))}
              </div>
            )}

            {activeNav==='Fraud Alerts'&&isAdmin&&(
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                {[
                  {title:'🚨 Large Transactions (≥ LKR 100,000)',items:fraud.large,hbg:'#fef2f2',cbg:'#b91c1c',render:t=>[<span className="cr">{t.customerNo}</span>,<span style={{fontWeight:500}}>{t.customerName}</span>,<span className={`bdg ${t.type==='Deposit'?'bd':'bw'}`}>{t.type}</span>,<span style={{fontWeight:700,color:'#b91c1c'}}>LKR {fmtN(t.amount)}</span>,<span style={{color:'#64748b',fontSize:11}}>{t.createdAt?.slice(0,10)}</span>]},
                  {title:'🚨 Suspicious Activity (Multiple large withdrawals today)',items:fraud.suspicious,hbg:'#fef2f2',cbg:'#b91c1c',render:s=>[<span className="cr">{s.customerNo}</span>,<span style={{fontWeight:500}}>{s.customerName}</span>,<span style={{color:'#b91c1c',fontWeight:700}}>{s.txCount} withdrawals</span>,<span style={{fontWeight:700}}>LKR {fmtN(s.totalAmount)}</span>]},
                  {title:'⚠️ Delinquent Loans (No EMI in 35+ days)',items:fraud.delinquent,hbg:'#fef3c7',cbg:'#b45309',render:l=>[<span className="cr loan">{l.loanNo}</span>,<span className="cr">{l.customerNo}</span>,<span style={{fontWeight:500}}>{l.customerName}</span>,<span style={{color:'#b45309',fontWeight:700}}>LKR {fmtN(l.monthlyPayment)}/mo</span>,<span style={{fontSize:11,color:'#64748b'}}>Last: {l.lastPayment?new Date(l.lastPayment).toLocaleDateString():'Never'}</span>]},
                ].map((sec,si)=>(
                  <div key={si} className="card" style={{marginBottom:0}}>
                    <div className="ct" style={{background:sec.hbg}}>{sec.title}<span className="cbg" style={{background:sec.cbg}}>{sec.items.length}</span></div>
                    {sec.items.length===0?<div className="nr">No alerts</div>
                    :sec.items.map((item,ii)=>(
                      <div key={ii} className="fraud-item">{sec.render(item).map((el,ei)=><span key={ei}>{el}</span>)}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Main grid */}
            <div className="mg">
              <div className="card" style={{marginBottom:0}}>
                <div className="ct">Active Customers<span className="cbg">{customers.filter(c=>c.status==='Active').length}</span></div>
                <table className="tbl">
                  <thead><tr><th>CR Number</th><th>Name</th><th>Email</th><th>Balance</th><th>Status</th></tr></thead>
                  <tbody>
                    {customers.filter(c=>c.status==='Active').length===0?<tr><td colSpan={5} className="ec">No active customers</td></tr>
                    :customers.filter(c=>c.status==='Active').slice(0,7).map(c=>(
                      <tr key={c.customerId}>
                        <td><span className="cr">{c.customerNo}</span></td>
                        <td style={{fontWeight:500}}>{c.fullName}</td>
                        <td style={{color:'#64748b',fontSize:11}}>{c.email}</td>
                        <td><span className="balcell">LKR {fmtN(c.balance||0)}</span></td>
                        <td><span className="bdg ba">Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card" style={{marginBottom:0}}>
                <div className="ct">Currency Rates</div>
                {[{p:'USD / EUR',r:'0.9405',f:'🇪🇺'},{p:'USD / GBP',r:'0.7638',f:'🇬🇧'},{p:'USD / JPY',r:'151.28',f:'🇯🇵'},{p:'USD / LKR',r:'306.40',f:'🇱🇰'}].map((x,i)=>(
                  <div key={i} className="ri2"><div className="rl"><span style={{fontSize:18}}>{x.f}</span><span>{x.p}</span></div><span className="rv">{x.r}</span></div>
                ))}
              </div>
            </div>

            {/* Bottom grid */}
            <div className="bg">
              {/* Loan Overview + EMI */}
              <div className="card" style={{marginBottom:0}}>
                <div className="ct">
                  Loan Overview &amp; EMI
                  {activeLoan&&<span className="lt-badge" style={{background:lt_bg(activeLoan.loanType),color:lt_color(activeLoan.loanType),marginLeft:6}}>{lt_icon(activeLoan.loanType)} {activeLoan.loanType||'Loan'}</span>}
                </div>
                {loans.length>1&&<div className="lsel">{loans.map(l=><button key={l.loanId} className={`lpil ${selectedLoan?.loanId===l.loanId?'s':''}`} onClick={()=>{setSelectedLoan(l);setPayResult(null);}}>{lt_icon(l.loanType)} {l.loanNo}</button>)}</div>}
                {!activeLoan?<div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:13}}>No loans yet. Apply from the Loan Management menu.</div>:<>
                  {[
                    {k:'Loan ID',      v:<span className="cr loan">{activeLoan.loanNo}</span>},
                    {k:'Loan Type',    v:<span className="lt-badge" style={{background:lt_bg(activeLoan.loanType),color:lt_color(activeLoan.loanType)}}>{lt_icon(activeLoan.loanType)} {activeLoan.loanType}</span>},
                    {k:'CR Number',    v:<span className="cr">{activeLoan.customerNo}</span>},
                    {k:'Customer',     v:activeLoan.customerName},
                    {k:'Loan Amount',  v:`LKR ${fmtN(activeLoan.amount)}`},
                    {k:'Interest Rate',v:<span style={{fontWeight:700,color:lt_color(activeLoan.loanType)}}>{activeLoan.interestRate||'—'}% p.a.</span>},
                    {k:'Total Interest',v:`LKR ${fmtN(activeLoan.totalInterest||0)}`},
                    {k:'Total Payable', v:`LKR ${fmtN(activeLoan.totalPayable||activeLoan.amount)}`},
                    {k:'Monthly EMI',  v:`LKR ${fmtN(activeLoan.monthlyPayment||0)}`},
                    {k:'Period',       v:`${activeLoan.months} months`},
                    {k:'Status',       v:activeLoan.status},
                  ].map((r,i)=>(
                    <div key={i} className="lr">
                      <span className="lk">{r.k}</span>
                      <span className="lv" style={{color:r.k==='Status'?(activeLoan.status==='Active'?'#16a34a':activeLoan.status==='Pending'?'#b45309':'#64748b'):'#1a3a6b'}}>{r.v}</span>
                    </div>
                  ))}
                  <div className="prw"><div className="prt"><div className="prf" style={{width:`${activeLoan.progress}%`,background:lt_color(activeLoan.loanType)}}/></div><div className="prl">{activeLoan.progress}% repaid</div></div>
                  {activeLoan.status==='Active'&&<div className="ps">
                    <div className="pt">💳 Pay EMI — {lt_icon(activeLoan.loanType)} {activeLoan.loanType}</div>
                    <input className="pinp" placeholder={`Loan ID e.g. ${activeLoan.loanNo}`} type="text" value={form.emiLoanNo||''} onChange={e=>setForm(f=>({...f,emiLoanNo:e.target.value.toUpperCase()}))}/>
                    <input className="pinp" placeholder="CR Number e.g. CR10000001" type="text" value={form.emiCrNo||''} onChange={e=>setForm(f=>({...f,emiCrNo:e.target.value.toUpperCase()}))}/>
                    <div className="pr2">
                      <input className="pinp" style={{marginBottom:0}} placeholder={`Amount e.g. LKR ${fmtN(activeLoan.monthlyPayment||0)}`} type="text" inputMode="decimal" value={form.emiAmount||''} onChange={e=>setForm(f=>({...f,emiAmount:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&doPayEmi()}/>
                      <button className="pbtn" onClick={doPayEmi}>Pay Now</button>
                    </div>
                    <input className="pinp" placeholder="Note (optional)" value={form.emiNote||''} onChange={e=>setForm(f=>({...f,emiNote:e.target.value}))}/>
                    <div className="phint">✅ Amount deducted from the CR number's account automatically</div>
                    {payResult&&<div className="pres">
                      {[['Loan ID',payResult.loanNo],['Loan Type',payResult.loanType],['CR Number',payResult.customerNo],['Amount Paid',`LKR ${fmtN(payResult.amountPaid)}`],['New Balance',`LKR ${fmtN(payResult.newBalance)}`],['Total Paid',`LKR ${fmtN(payResult.totalPaid)}`],['Remaining',`LKR ${fmtN(payResult.remaining)}`],['Progress',`${payResult.loanProgress}%`]].map(([k,v],i)=>(
                        <div key={i} className="prr"><span>{k}</span><span style={k==='New Balance'?{color:'#dc2626'}:{}}>{v}</span></div>
                      ))}
                      {payResult.loanStatus==='Completed'&&<div className="prc">🎉 Loan Fully Repaid!</div>}
                    </div>}
                  </div>}
                  {activeLoan.emiPayments?.length>0&&<>
                    <div className="eh">EMI History ({activeLoan.emiPayments.length} payments)</div>
                    {[...activeLoan.emiPayments].sort((a,b)=>new Date(b.paidAt)-new Date(a.paidAt)).map((e,i)=>(
                      <div key={i} className="er">
                        <span style={{color:'#64748b'}}>{new Date(e.paidAt).toLocaleDateString()} {new Date(e.paidAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                        <span style={{fontWeight:600}}>LKR {fmtN(e.amount)}</span>
                        <span style={{color:'#94a3b8',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.note}</span>
                        <span className="ep">✓ Paid</span>
                      </div>
                    ))}
                  </>}
                </>}
              </div>

              {/* Summary */}
              <div className="card" style={{marginBottom:0}}>
                <div className="ct">Account &amp; Transaction Summary</div>
                <div className="sg">
                  <div className="sb2 bl"><div className="sl">Total Accounts</div><div className="sv">{summary.totalAccounts}</div></div>
                  <div className="sb2 nv"><div className="sl">Total Deposits</div><div className="sv" style={{fontSize:13}}>LKR {Math.round(summary.totalDeposits).toLocaleString()}</div></div>
                  <div className="sb2 gn"><div className="sl">Transactions</div><div className="sv">{summary.totalTransactions}</div></div>
                  <div className="sb2 rd"><div className="sl">Withdrawals</div><div className="sv" style={{fontSize:13}}>LKR {Math.round(summary.totalWithdrawals).toLocaleString()}</div></div>
                </div>
                <div className="txm">
                  <div className="txh">Recent Transactions</div>
                  {transactions.length===0?<div style={{padding:'9px 13px',fontSize:12,color:'#94a3b8'}}>No transactions yet</div>
                  :transactions.slice(0,6).map(t=>{
                    const p=t.type==='Deposit'||t.type==='Transfer In';
                    return <div key={t.transactionId} className="txr">
                      <div><span style={{color:'#374151'}}>{t.description||t.type}</span>{t.customerNo&&<span style={{marginLeft:5}}><span className="cr" style={{fontSize:10,padding:'1px 5px'}}>{t.customerNo}</span></span>}</div>
                      <span style={{fontWeight:600,color:p?'#16a34a':'#dc2626'}}>{p?'+':'−'}LKR {fmtN(t.amount)}</span>
                    </div>;
                  })}
                </div>
              </div>

              {/* Reports */}
              <div className="card" style={{marginBottom:0}}>
                <div className="ct">Reports &amp; Export</div>
                <div className="rpg">
                  {[{n:'Customer',t:'Customer',d:customers},{n:'Account',t:'Account',d:allAccounts},{n:'Loan',t:'Loan',d:loans},{n:'Transaction',t:'Transaction',d:transactions}].map(r=>(
                    <div key={r.t} className="rpb">
                      <div className="rpi">📄</div>
                      <div className="rpn">{r.n}</div>
                      <button className="rpbtn" onClick={()=>pdfBulk(r.t,r.d)}>🖨 Print PDF</button>
                      {isAdmin&&<button className="csv-btn" style={{width:'100%',padding:'5px 0'}} onClick={()=>exportCSV(r.t)}>📥 CSV</button>}
                    </div>
                  ))}
                </div>
                <div className="lss">
                  <div className="lsh">Loan Statistics</div>
                  {[
                    {l:'Total Loans',v:loans.length},
                    ...LOAN_TYPES.map(lt=>({l:`${lt.icon} ${lt.type}`,v:loans.filter(l=>l.loanType===lt.type).length})),
                    {l:'Active',v:loans.filter(l=>l.status==='Active').length},
                    {l:'Pending',v:loans.filter(l=>l.status==='Pending').length},
                    {l:'Completed',v:loans.filter(l=>l.status==='Completed').length},
                    {l:'Rejected',v:loans.filter(l=>l.status==='Rejected').length},
                  ].map((s,i)=>(
                    <div key={i} className="lsr"><span style={{color:'#64748b'}}>{s.l}</span><span style={{fontWeight:700,color:'#1a3a6b'}}>{s.v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {modal&&(
        <div className="ovl" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div className="mdl">

            {modal==='customer'&&<>
              <div className="mtt">👤 Add New Customer</div>
              {!newCustRes?<>
                <div className="note">✅ CR number auto-generated (e.g. CR10000001). Each customer gets a unique number.</div>
                <label className="ml">Full Name *</label><input className="mi" placeholder="John Smith" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/>
                <label className="ml">Email *</label><input className="mi" placeholder="john@email.com" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/>
                <label className="ml">Phone</label><input className="mi" placeholder="0771234567" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/>
                <div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={doNewCustomer}>Create Customer</button></div>
              </>:<>
                <div className="suc">
                  <div className="suc-t">✅ Customer Created Successfully!</div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>Auto-generated CR Number — save this:</div>
                  <div className="suc-id">{newCustRes.customerNo}</div>
                  <div className="suc-s">Use this CR number for accounts, loans, transactions &amp; EMI payments</div>
                </div>
                <div className="mf"><button className="mb p" onClick={closeModal}>Done</button></div>
              </>}
            </>}

            {modal==='summary'&&<>
              <div className="mtt">🔍 Customer Summary</div>
              <label className="ml">Enter CR Number</label>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input className="mi" style={{marginBottom:0}} placeholder="e.g. CR10000001" value={form.sumCr||''} onChange={e=>setForm({...form,sumCr:e.target.value.toUpperCase()})}/>
                <button className="mb p" style={{flex:'0 0 auto',padding:'9px 16px'}} onClick={()=>loadCustSumm(form.sumCr)}>{summLoad?'...':'Search'}</button>
              </div>
              {custSumm&&<>
                <div className="csbox">
                  <div className="csbox-t">Summary for {custSumm.customerNo}</div>
                  <div className="csgrid">
                    {[{l:'CR Number',v:custSumm.customerNo},{l:'Name',v:custSumm.fullName},{l:'Phone',v:custSumm.phone||'—'},{l:'Status',v:custSumm.status},{l:'Balance',v:`LKR ${fmtN(custSumm.balance||0)}`},{l:'Accounts',v:custSumm.accounts?.length||0},{l:'Total Loans',v:custSumm.totalLoans||0},{l:'Active Loans',v:custSumm.activeLoans||0}].map((x,i)=>(
                      <div key={i} className="csitem"><div className="csitem-l">{x.l}</div><div className="csitem-v" style={x.l==='Balance'?{color:'#16a34a'}:x.l==='Active Loans'&&custSumm.activeLoans>0?{color:'#dc2626'}:{}}>{x.v}</div></div>
                    ))}
                  </div>
                  {custSumm.accounts?.map((a,i)=>(
                    <div key={i} style={{background:'white',borderRadius:6,padding:'8px 10px',marginTop:8,border:'1px solid #e2e8f0',fontSize:12}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:600,color:'#1a3a6b'}}>{a.accountType}</span><span style={{fontWeight:700,color:'#16a34a'}}>LKR {fmt(a.balance)}</span></div>
                      <div style={{color:'#64748b',fontSize:11,marginTop:2}}>#{a.accountNumber}</div>
                    </div>
                  ))}
                </div>
                <button className="mb p" style={{width:'100%',marginTop:10}} onClick={()=>doPDF(custSumm.customerId)}>🖨 Print Customer PDF</button>
              </>}
              <div className="mf" style={{marginTop:12}}><button className="mb c" onClick={closeModal}>Close</button></div>
            </>}

            {modal==='account'&&<>
              <div className="mtt">🏦 Create New Account</div>
              <div className="note">Enter the customer's CR number (e.g. CR10000001)</div>
              <label className="ml">CR Number *</label><input className="mi" placeholder="e.g. CR10000001" value={form.crNo||''} onChange={e=>setForm({...form,crNo:e.target.value.toUpperCase()})}/>
              <label className="ml">Account Type *</label>
              <select className="ms" value={form.type||''} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="">Select type</option><option>Savings Account</option><option>Checking Account</option><option>Current Account</option><option>Credit Card Balance</option>
              </select>
              <div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={doNewAccount}>Create Account</button></div>
            </>}

            {modal==='transaction'&&<>
              <div className="mtt">⇄ New Transaction</div>
              <div className="note">Enter CR number — system finds the account automatically</div>
              <label className="ml">CR Number *</label><input className="mi" placeholder="e.g. CR10000001" value={form.crNo||''} onChange={e=>setForm({...form,crNo:e.target.value.toUpperCase()})}/>
              <label className="ml">Type *</label>
              <select className="ms" value={form.type||''} onChange={e=>setForm({...form,type:e.target.value})}><option value="">Select type</option><option>Deposit</option><option>Withdrawal</option></select>
              <label className="ml">Amount (LKR) *</label><input className="mi" placeholder="1000" type="text" inputMode="decimal" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/>
              <label className="ml">Description</label><input className="mi" placeholder="Optional" value={form.desc||''} onChange={e=>setForm({...form,desc:e.target.value})}/>
              <div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={doNewTx}>Save</button></div>
            </>}

            {modal==='loan'&&<>
              <div className="mtt">💰 Apply for Loan</div>
              <div className="step-hd">
                <div className={`step-dot ${loanStep>=1?(loanStep>1?'done':'act'):'wait'}`}>{loanStep>1?'✓':'1'}</div>
                <div className="step-line"/>
                <div className={`step-dot ${loanStep>=2?'act':'wait'}`}>2</div>
              </div>
              <div style={{fontSize:12,color:'#64748b',marginBottom:13,textAlign:'center'}}>{loanStep===1?'Step 1: Select Loan Type':'Step 2: Enter Loan Details'}</div>
              {!newLoanRes?<>
                {loanStep===1&&<>
                  <div className="lt-grid">
                    {LOAN_TYPES.map(lt=>(
                      <div key={lt.type} className="lt-card" style={selType?.type===lt.type?{borderColor:lt.color,background:lt.bg}:{}} onClick={()=>setSelType(lt)}>
                        <div className="lt-icon">{lt.icon}</div>
                        <div className="lt-name">{lt.type}</div>
                        <div className="lt-desc">{lt.desc}</div>
                        <div className="lt-rate" style={{background:lt.color,color:'white'}}>{lt.rate}% p.a.</div>
                        <div className="lt-range">LKR {lt.min.toLocaleString()}–{lt.max.toLocaleString()} | {lt.minM}–{lt.maxM}mo</div>
                      </div>
                    ))}
                  </div>
                  <div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={()=>{if(!selType){toast$('❌ Select a loan type','err');return;}setLoanStep(2);}}>Next →</button></div>
                </>}
                {loanStep===2&&<>
                  <div style={{background:selType.bg,borderRadius:10,padding:'10px 13px',marginBottom:13,display:'flex',alignItems:'center',gap:10,border:`1.5px solid ${selType.color}`}}>
                    <span style={{fontSize:22}}>{selType.icon}</span>
                    <div><div style={{fontWeight:700,color:selType.color}}>{selType.type}</div><div style={{fontSize:12,color:'#64748b'}}>{selType.rate}% p.a. | {selType.minM}–{selType.maxM} months</div></div>
                    <button onClick={()=>setLoanStep(1)} style={{marginLeft:'auto',padding:'4px 10px',background:'none',border:`1px solid ${selType.color}`,borderRadius:6,color:selType.color,fontSize:11,cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:600}}>Change</button>
                  </div>
                  <div className="note">⚠️ Customer must have an existing account. Loan ID is auto-generated.</div>
                  <label className="ml">CR Number *</label><input className="mi" placeholder="e.g. CR10000001" value={form.crNo||''} onChange={e=>setForm({...form,crNo:e.target.value.toUpperCase()})}/>
                  <label className="ml">Loan Amount (LKR) *</label><input className="mi" placeholder={`e.g. ${selType.min.toLocaleString()}`} type="text" inputMode="decimal" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/>
                  <label className="ml">Repayment Period ({selType.minM}–{selType.maxM} months)</label>
                  <select className="ms" value={form.months||String(selType.minM)} onChange={e=>setForm({...form,months:e.target.value})}>
                    {Array.from({length:Math.floor((selType.maxM-selType.minM)/6)+1},(_,i)=>selType.minM+i*6).map(m=><option key={m} value={m}>{m} months ({Math.floor(m/12)}yr {m%12>0?m%12+'mo':''})</option>)}
                  </select>
                  {emiPreview&&(
                    <div className="emi-calc" style={{background:selType.bg,border:`1px solid ${selType.color}`}}>
                      <div className="emi-calc-t" style={{color:selType.color}}>{selType.icon} EMI Preview</div>
                      <div className="emi-row"><span style={{color:'#64748b'}}>Principal</span><span style={{fontWeight:600}}>LKR {fmtN(parseFloat(form.amount))}</span></div>
                      <div className="emi-row"><span style={{color:'#64748b'}}>Rate</span><span style={{fontWeight:600,color:selType.color}}>{selType.rate}% p.a.</span></div>
                      <div className="emi-row"><span style={{color:'#64748b'}}>Total Interest</span><span style={{color:'#dc2626',fontWeight:600}}>LKR {fmtN(emiPreview.totalInterest)}</span></div>
                      <div className="emi-row tot"><span>Total Payable</span><span>LKR {fmtN(emiPreview.totalPayable)}</span></div>
                      <div className="emi-row" style={{marginTop:4}}><span style={{color:'#64748b'}}>Monthly EMI</span><span style={{fontWeight:700,fontSize:15,color:selType.color}}>LKR {fmtN(emiPreview.monthly)}</span></div>
                    </div>
                  )}
                  <div className="mf"><button className="mb c" onClick={()=>setLoanStep(1)}>← Back</button><button className="mb p" onClick={doNewLoan}>Apply Now</button></div>
                </>}
              </>:<>
                <div className="suc">
                  <div className="suc-t">✅ Loan Application Submitted!</div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:4}}>Type: {newLoanRes.loanType}</div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>Auto-generated Loan ID:</div>
                  <div className="suc-id">{newLoanRes.loanNo}</div>
                  <div className="suc-s">Rate: {newLoanRes.interestRate}% | EMI: LKR {fmtN(newLoanRes.monthly)} | Total: LKR {fmtN(newLoanRes.totalPayable)}</div>
                  <div className="suc-s" style={{marginTop:5,color:'#b45309',fontWeight:600}}>{isAdmin?'Approve the loan to activate it':'Awaiting Admin approval'}</div>
                </div>
                <div className="mf"><button className="mb p" onClick={closeModal}>Done</button></div>
              </>}
            </>}

            {modal==='payemi'&&<>
              <div className="mtt">💳 Pay EMI Installment</div>
              <div className="note">Enter <strong>Loan ID</strong> + <strong>CR Number</strong>.<br/>Amount is automatically deducted from the CR number's account balance.</div>
              <label className="ml">Loan ID *</label><input className="mi" placeholder="e.g. LN10000001" type="text" value={form.emiLoanNo||''} onChange={e=>setForm({...form,emiLoanNo:e.target.value.toUpperCase()})}/>
              <label className="ml">CR Number *</label><input className="mi" placeholder="e.g. CR10000001" type="text" value={form.emiCrNo||''} onChange={e=>setForm({...form,emiCrNo:e.target.value.toUpperCase()})}/>
              <label className="ml">Payment Amount (LKR) *</label><input className="mi" placeholder="e.g. 5000" type="text" inputMode="decimal" value={form.emiAmount||''} onChange={e=>setForm({...form,emiAmount:e.target.value})}/>
              <label className="ml">Note (optional)</label><input className="mi" placeholder="e.g. November EMI" value={form.emiNote||''} onChange={e=>setForm({...form,emiNote:e.target.value})}/>
              {!payResult
                ?<div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={doPayEmi}>Pay Now</button></div>
                :<>
                  <div className="pres" style={{marginBottom:12}}>
                    {[['Loan ID',payResult.loanNo],['Loan Type',payResult.loanType],['CR Number',payResult.customerNo],['Amount Paid',`LKR ${fmtN(payResult.amountPaid)}`],['New Account Balance',`LKR ${fmtN(payResult.newBalance)}`],['Total Paid',`LKR ${fmtN(payResult.totalPaid)}`],['Remaining',`LKR ${fmtN(payResult.remaining)}`],['Progress',`${payResult.loanProgress}%`]].map(([k,v],i)=>(
                      <div key={i} className="prr"><span>{k}</span><span style={k==='New Account Balance'?{color:'#dc2626'}:{}}>{v}</span></div>
                    ))}
                    {payResult.loanStatus==='Completed'&&<div className="prc">🎉 Loan Fully Repaid!</div>}
                  </div>
                  <div className="mf"><button className="mb c" onClick={()=>{setPayResult(null);setForm({});}}>Pay Another</button><button className="mb p" onClick={closeModal}>Done</button></div>
                </>
              }
            </>}

          </div>
        </div>
      )}

      {toast.msg&&<div className={`tst ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
