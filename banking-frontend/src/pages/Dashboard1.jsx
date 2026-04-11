import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://localhost:7001';
const PAGE = 8;

const getErr = (err) => {
  const d = err?.response?.data;
  if (!d) return err?.message || 'Something went wrong';
  if (typeof d === 'string') return d;
  if (d.message) return d.message;
  if (d.title)   return d.title;
  if (d.errors)  return Object.values(d.errors).flat().join(', ');
  return 'Request failed';
};

const LOAN_TYPES = [
  { type:'Personal Loan', icon:'👤', rate:14.5, color:'#2c5aa0', bg:'#e8f0fb', desc:'For personal needs, education, medical', min:10000, max:500000, minM:6, maxM:60 },
  { type:'Home Loan',     icon:'🏠', rate:8.5,  color:'#15803d', bg:'#dcfce7', desc:'For buying or building a home',         min:500000,max:10000000,minM:60,maxM:360 },
  { type:'Vehicle Loan',  icon:'🚗', rate:10.5, color:'#b45309', bg:'#fef3c7', desc:'For buying a car or vehicle',           min:50000, max:3000000, minM:12,maxM:84  },
  { type:'Business Loan', icon:'💼', rate:12.0, color:'#7c3aed', bg:'#ede9fe', desc:'For business expansion',               min:100000,max:5000000, minM:12,maxM:120 },
];

const calcEMI = (amount, months, rate) => {
  if (!amount || !months || !rate) return null;
  const years = months / 12;
  const totalInterest = Math.round(amount * rate / 100 * years * 100) / 100;
  const totalPayable  = amount + totalInterest;
  const monthly       = Math.round((totalPayable / months) * 100) / 100;
  return { monthly, totalInterest, totalPayable };
};

const loanColor = (type) => LOAN_TYPES.find(l=>l.type===type)?.color || '#1a3a6b';
const loanIcon  = (type) => LOAN_TYPES.find(l=>l.type===type)?.icon  || '💳';
const loanBg    = (type) => LOAN_TYPES.find(l=>l.type===type)?.bg    || '#f0f4fb';

const printCustomerPDF = (c) => {
  const txs=c.accounts?.flatMap(a=>a.transactions||[])||[];
  const bal=c.accounts?.reduce((s,a)=>s+a.balance,0)||0;
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${c.customerNo}</title>
  <style>body{font-family:Segoe UI,sans-serif;padding:32px;color:#111;}
  .hdr{background:#1a3a6b;color:white;padding:22px 28px;border-radius:8px;margin-bottom:20px;}
  .hdr h1{font-size:20px;margin:0 0 4px;}.hdr p{margin:0;font-size:12px;opacity:.8;}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
  .ib{background:#f8faff;border:1px solid #dde3ec;border-radius:6px;padding:10px 14px;}
  .il{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}
  .iv{font-size:14px;font-weight:700;color:#1a3a6b;}
  .sumb{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
  .sum{background:#1a3a6b;color:white;border-radius:6px;padding:12px;text-align:center;}
  .sum .sl{font-size:10px;opacity:.8;margin-bottom:4px;}.sum .sv{font-size:16px;font-weight:700;}
  h2{font-size:14px;font-weight:700;color:#1a3a6b;border-bottom:2px solid #1a3a6b;padding-bottom:5px;margin:16px 0 10px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}thead tr{background:#1a3a6b;color:white;}
  th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #f1f5f9;}
  .foot{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:10px;}
  </style></head><body>
  <div class="hdr"><h1>🏛 Bank System — Customer Report</h1>
  <p>Generated: ${new Date().toLocaleString()} | CR: ${c.customerNo}</p></div>
  <div class="sumb">
    <div class="sum"><div class="sl">CR Number</div><div class="sv">${c.customerNo}</div></div>
    <div class="sum"><div class="sl">Balance</div><div class="sv">LKR ${bal.toLocaleString()}</div></div>
    <div class="sum"><div class="sl">Accounts</div><div class="sv">${c.accounts?.length||0}</div></div>
    <div class="sum"><div class="sl">Loans</div><div class="sv">${c.loans?.length||0}</div></div>
  </div>
  <div class="g2">
    <div class="ib"><div class="il">CR Number</div><div class="iv">${c.customerNo}</div></div>
    <div class="ib"><div class="il">Full Name</div><div class="iv">${c.fullName}</div></div>
    <div class="ib"><div class="il">Email</div><div class="iv">${c.email}</div></div>
    <div class="ib"><div class="il">Phone</div><div class="iv">${c.phone||'—'}</div></div>
    <div class="ib"><div class="il">Status</div><div class="iv">${c.status}</div></div>
    <div class="ib"><div class="il">Member Since</div><div class="iv">${new Date(c.createdAt).toLocaleDateString()}</div></div>
  </div>
  <h2>Accounts</h2>${c.accounts?.length?`<table><thead><tr><th>Account No</th><th>Type</th><th>Balance</th><th>Created</th></tr></thead><tbody>${c.accounts.map(a=>`<tr><td>${a.accountNumber}</td><td>${a.accountType}</td><td>LKR ${parseFloat(a.balance).toLocaleString()}</td><td>${new Date(a.createdAt).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`:'<p style="color:#94a3b8">No accounts</p>'}
  <h2>Loans</h2>${c.loans?.length?`<table><thead><tr><th>Loan ID</th><th>Type</th><th>Amount</th><th>Rate</th><th>EMI</th><th>Total Payable</th><th>Status</th><th>Progress</th></tr></thead><tbody>${c.loans.map(l=>`<tr><td>${l.loanNo}</td><td>${l.loanType}</td><td>LKR ${parseFloat(l.amount).toLocaleString()}</td><td>${l.interestRate}%</td><td>LKR ${parseFloat(l.monthlyPayment).toLocaleString()}</td><td>LKR ${parseFloat(l.totalPayable||l.amount).toLocaleString()}</td><td>${l.status}</td><td>${l.progress}%</td></tr>`).join('')}</tbody></table>`:'<p style="color:#94a3b8">No loans</p>'}
  <h2>Transactions</h2>${txs.length?`<table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead><tbody>${txs.slice(0,20).map(t=>`<tr><td>${new Date(t.createdAt).toLocaleDateString()}</td><td>${t.type}</td><td>LKR ${parseFloat(t.amount).toLocaleString()}</td><td>${t.description}</td></tr>`).join('')}</tbody></table>`:'<p style="color:#94a3b8">No transactions</p>'}
  <div class="foot">Bank System | Confidential | ${new Date().toLocaleDateString()}</div></body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
};

const printBulk = (type, data) => {
  const cols={Customer:['CR Number','Name','Email','Phone','Balance','Accounts','Status','Joined'],Account:['Account No','CR Number','Customer','Type','Balance','Created'],Transaction:['ID','Date','Type','CR Number','Customer','Description','Amount'],Loan:['Loan ID','Type','CR Number','Customer','Amount','Rate%','EMI','Total Payable','Months','Status','Progress']};
  const rows={Customer:data.map(c=>[c.customerNo,c.fullName,c.email,c.phone||'—',`LKR ${(c.balance||0).toLocaleString()}`,c.accountCount||0,c.status,new Date(c.createdAt).toLocaleDateString()]),Account:data.map(a=>[a.accountNumber,a.customerNo||'—',a.customerName,a.accountType,`LKR ${parseFloat(a.balance).toLocaleString()}`,new Date(a.createdAt).toLocaleDateString()]),Transaction:data.map(t=>['T'+String(t.transactionId).padStart(3,'0'),t.createdAt?.slice(0,10),t.type,t.customerNo||'—',t.customer||'—',t.description,`LKR ${parseFloat(t.amount).toLocaleString()}`]),Loan:data.map(l=>[l.loanNo,l.loanType||'—',l.customerNo,l.customerName,`LKR ${parseFloat(l.amount).toLocaleString()}`,`${l.interestRate||'—'}%`,`LKR ${parseFloat(l.monthlyPayment).toLocaleString()}`,`LKR ${parseFloat(l.totalPayable||l.amount).toLocaleString()}`,`${l.months}mo`,l.status,`${l.progress}%`])};
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${type} Report</title><style>body{font-family:Segoe UI,sans-serif;padding:24px;}.hdr{background:#1a3a6b;color:white;padding:16px 22px;border-radius:6px;margin-bottom:18px;}.hdr h1{font-size:17px;margin:0 0 3px;}.hdr p{margin:0;font-size:11px;opacity:.8;}table{width:100%;border-collapse:collapse;font-size:11px;}thead tr{background:#1a3a6b;color:white;}th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #f1f5f9;}tr:nth-child(even) td{background:#f8faff;}.foot{margin-top:18px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:8px;}</style></head><body><div class="hdr"><h1>🏛 Bank System — ${type} Report</h1><p>Generated: ${new Date().toLocaleString()} | Total: ${data.length} records</p></div><table><thead><tr>${cols[type].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows[type].map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="foot">Bank System | Confidential | ${new Date().toLocaleDateString()}</div></body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
};

export default function Dashboard() {
  const [customers,    setCustomers]    = useState([]);
  const [allAccounts,  setAllAccounts]  = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loans,        setLoans]        = useState([]);
  const [recentCusts,  setRecentCusts]  = useState([]);
  const [recentAccs,   setRecentAccs]   = useState([]);
  const [recentTxs,    setRecentTxs]    = useState([]);
  const [auditLogs,    setAuditLogs]    = useState([]);
  const [fraudAlerts,  setFraudAlerts]  = useState({large:[],suspicious:[],delinquent:[]});
  const [summary,      setSummary]      = useState({totalAccounts:0,totalDeposits:0,totalWithdrawals:0,totalTransactions:0});
  const [loading,      setLoading]      = useState(true);
  const [activeNav,    setActiveNav]    = useState('Dashboard');
  const [modal,        setModal]        = useState(null);
  const [form,         setForm]         = useState({});
  const [toast,        setToast]        = useState({msg:'',type:'success'});
  const [dd,           setDd]           = useState(null);
  const [search,       setSearch]       = useState('');
  const [statusFil,    setStatusFil]    = useState('All');
  const [page,         setPage]         = useState(1);
  const [payResult,    setPayResult]    = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [newCustRes,   setNewCustRes]   = useState(null);
  const [newLoanRes,   setNewLoanRes]   = useState(null);
  const [custSummary,  setCustSummary]  = useState(null);
  const [summLoad,     setSummLoad]     = useState(false);
  const [loanStep,     setLoanStep]     = useState(1);
  const [selType,      setSelType]      = useState(null);
  // CSV export filter
  const [csvFrom,      setCsvFrom]      = useState('');
  const [csvTo,        setCsvTo]        = useState('');
  const [csvTxType,    setCsvTxType]    = useState('');
  const [csvLoanType,  setCsvLoanType]  = useState('');
  const [csvLoanStatus,setCsvLoanStatus]= useState('');

  const navigate = useNavigate();
  const fullName = localStorage.getItem('fullName') || 'Admin';
  const token    = localStorage.getItem('token');
  const userRole = localStorage.getItem('role')    || 'Teller';
  const headers  = { Authorization: `Bearer ${token}` };
  const isAdmin  = userRole === 'Admin';

  const toast$ = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast({msg:'',type:'success'}),4500); };
  const openModal  = (t,d={}) => { setForm(d); setModal(t); setDd(null); setPayResult(null); setNewCustRes(null); setNewLoanRes(null); setCustSummary(null); setLoanStep(1); setSelType(null); };
  const closeModal = () => { setModal(null); setForm({}); setPayResult(null); setNewCustRes(null); setNewLoanRes(null); setCustSummary(null); setLoanStep(1); setSelType(null); };

  const load = async () => {
    setLoading(true);
    try {
      const [cR,tR,lR,aR,rcR,raR,allAccR] = await Promise.all([
        axios.get(`${API}/api/customer`,{headers}).catch(()=>({data:[]})),
        axios.get(`${API}/api/transaction`,{headers}).catch(()=>({data:[]})),
        axios.get(`${API}/api/loan`,{headers}).catch(()=>({data:[]})),
        axios.get(`${API}/api/account/summary`,{headers}).catch(()=>({data:{totalAccounts:0}})),
        axios.get(`${API}/api/customer/recent`,{headers}).catch(()=>({data:[]})),
        axios.get(`${API}/api/account/recent`,{headers}).catch(()=>({data:[]})),
        axios.get(`${API}/api/account`,{headers}).catch(()=>({data:[]})),
      ]);
      setCustomers(cR.data); setTransactions(tR.data); setLoans(lR.data);
      setRecentCusts(rcR.data); setRecentAccs(raR.data); setAllAccounts(allAccR.data);
      const since = new Date(Date.now()-10*24*60*60*1000);
      setRecentTxs(tR.data.filter(t=>new Date(t.createdAt)>=since));
      setSummary({ totalAccounts:aR.data.totalAccounts??0, totalDeposits:tR.data.filter(t=>t.type==='Deposit').reduce((s,t)=>s+t.amount,0), totalWithdrawals:tR.data.filter(t=>t.type==='Withdrawal').reduce((s,t)=>s+t.amount,0), totalTransactions:tR.data.length });
      if (lR.data.length>0) setSelectedLoan(p=>p?lR.data.find(l=>l.loanId===p.loanId)||lR.data[0]:lR.data[0]);

      // Admin-only data
      if (isAdmin) {
        const [auditR,largeR,suspR,delinR] = await Promise.all([
          axios.get(`${API}/api/audit`,{headers}).catch(()=>({data:[]})),
          axios.get(`${API}/api/fraud/large-transactions`,{headers}).catch(()=>({data:{list:[]}})),
          axios.get(`${API}/api/fraud/suspicious-activity`,{headers}).catch(()=>({data:{list:[]}})),
          axios.get(`${API}/api/fraud/delinquent-loans`,{headers}).catch(()=>({data:{list:[]}})),
        ]);
        setAuditLogs(auditR.data);
        setFraudAlerts({ large:largeR.data.list||[], suspicious:suspR.data.list||[], delinquent:delinR.data.list||[] });
      }
    } catch(err) {
      if (err.response?.status===401) navigate('/login');
      else toast$('❌ Failed to connect. Check API is running.','error');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ const fn=()=>setDd(null); document.addEventListener('click',fn); return()=>document.removeEventListener('click',fn); },[]);

  const filtered = customers.filter(c=>{
    const ms=statusFil==='All'||c.status===statusFil;
    const s=search.toLowerCase();
    const mm=!s||c.fullName?.toLowerCase().includes(s)||c.phone?.includes(s)||c.customerNo?.toLowerCase().includes(s)||c.email?.toLowerCase().includes(s);
    return ms&&mm;
  });
  const totalPg=Math.ceil(filtered.length/PAGE);
  const pageC=filtered.slice((page-1)*PAGE,page*PAGE);
  const findByCR=val=>customers.find(c=>c.customerNo?.toUpperCase()===val?.trim().toUpperCase()||String(c.customerId)===val?.trim());

  const loadCustSummary=async(crNo)=>{ if(!crNo?.trim()){setCustSummary(null);return;} setSummLoad(true); try{const res=await axios.get(`${API}/api/customer/by-crno/${crNo.trim().toUpperCase()}`,{headers});setCustSummary(res.data);}catch(err){setCustSummary(null);toast$('❌ '+getErr(err),'error');}finally{setSummLoad(false);}};

  const doNewCustomer=async()=>{ if(!form.name?.trim()||!form.email?.trim()){toast$('❌ Name and email required','error');return;} try{const res=await axios.post(`${API}/api/customer`,{fullName:form.name.trim(),email:form.email.trim(),phone:form.phone||''},{headers});setNewCustRes(res.data);load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doNewAccount=async()=>{ if(!form.type||!form.crNo?.trim()){toast$('❌ All fields required','error');return;} const cust=findByCR(form.crNo); if(!cust){toast$('❌ Customer not found','error');return;} try{await axios.post(`${API}/api/account/create`,{accountType:form.type,customerId:cust.customerId},{headers});toast$('✅ Account created');closeModal();load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doNewTx=async()=>{ if(!form.type||!form.amount||!form.crNo?.trim()){toast$('❌ Fill all required fields','error');return;} const amt=parseFloat(String(form.amount).trim()); if(isNaN(amt)||amt<=0){toast$('❌ Invalid amount','error');return;} const cust=findByCR(form.crNo); if(!cust){toast$('❌ Customer not found','error');return;} if(!cust.accounts?.length){toast$('❌ Customer has no account','error');return;} try{const ep=form.type==='Deposit'?'deposit':'withdraw'; await axios.post(`${API}/api/transaction/${ep}`,{accountId:cust.accounts[0].accountId,amount:amt,description:form.desc||form.type},{headers});toast$('✅ Transaction recorded');closeModal();load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doNewLoan=async()=>{ if(!form.crNo?.trim()||!form.amount||!selType){toast$('❌ Fill all fields','error');return;} const cust=findByCR(form.crNo); if(!cust){toast$('❌ Customer not found','error');return;} try{const res=await axios.post(`${API}/api/loan/apply`,{customerId:cust.customerId,loanType:selType.type,amount:parseFloat(form.amount),months:parseInt(form.months||selType.minM)},{headers});setNewLoanRes(res.data);load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doApprove=async(id)=>{ if(!isAdmin){toast$('❌ Only Admin can approve loans','error');return;} try{await axios.put(`${API}/api/loan/${id}/approve`,{},{headers});toast$('✅ Loan approved');load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doReject=async(id)=>{ if(!isAdmin){toast$('❌ Only Admin can reject loans','error');return;} const reason=window.prompt('Enter rejection reason:'); if(!reason)return; try{await axios.put(`${API}/api/loan/${id}/reject`,JSON.stringify(reason),{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});toast$('🚫 Loan rejected');load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doPayEmi=async()=>{ const loanNo=form.emiLoanNo?.trim().toUpperCase(); const crNo=form.emiCrNo?.trim().toUpperCase(); const amt=parseFloat(String(form.emiAmount||'').trim()); if(!loanNo){toast$('❌ Enter Loan ID','error');return;} if(!crNo){toast$('❌ Enter CR Number','error');return;} if(!amt||amt<=0){toast$('❌ Enter valid amount','error');return;} try{const res=await axios.post(`${API}/api/loan/pay-emi`,{loanNo,customerNo:crNo,amount:amt,note:form.emiNote||''},{headers});setPayResult(res.data);toast$(`✅ EMI paid! Balance: LKR ${res.data.newBalance?.toLocaleString()}`);setForm(f=>({...f,emiAmount:'',emiNote:''}));load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doDelete=async(id)=>{ if(!isAdmin){toast$('❌ Only Admin can delete customers','error');return;} if(!window.confirm('Delete this customer?'))return; try{await axios.delete(`${API}/api/customer/${id}`,{headers});toast$('🗑 Deleted');load();}catch(err){toast$('❌ '+getErr(err),'error');}};
  const doPDF=async(custId)=>{ try{const res=await axios.get(`${API}/api/customer/${custId}`,{headers});printCustomerPDF(res.data);}catch{toast$('❌ Could not load customer','error');}};

  // CSV export
  const exportCSV = async (type) => {
    try {
      let url = `${API}/api/${type.toLowerCase()}/export/csv`;
      const params = new URLSearchParams();
      if (type==='Transaction') { if(csvFrom) params.append('from',csvFrom); if(csvTo) params.append('to',csvTo); if(csvTxType) params.append('type',csvTxType); }
      if (type==='Loan') { if(csvLoanType) params.append('loanType',csvLoanType); if(csvLoanStatus) params.append('status',csvLoanStatus); }
      if ([...params].length) url += '?' + params.toString();
      const res = await axios.get(url, { headers, responseType:'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(res.data);
      a.download = `${type.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      toast$(`✅ ${type} CSV exported`);
    } catch(err) { toast$('❌ '+getErr(err),'error'); }
  };

  const activeLoan = selectedLoan||loans[0];
  const emiPreview = selType&&form.amount&&form.months ? calcEMI(parseFloat(form.amount),parseInt(form.months),selType.rate) : null;
  const totalFraudAlerts = fraudAlerts.large.length + fraudAlerts.suspicious.length + fraudAlerts.delinquent.length;

  const navItems = [
    {label:'Dashboard',icon:'⊞'},
    {label:'Customer',icon:'👤'},
    {label:'Account',icon:'🏦'},
    {label:'Transaction',icon:'⇄'},
    {label:'Loan',icon:'💳'},
    {label:'Reports',icon:'🖨'},
    ...(isAdmin ? [{label:'Audit Log',icon:'📋'},{label:'Fraud Alerts',icon:'🚨',badge:totalFraudAlerts}] : []),
  ];
  const logout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',sans-serif;background:#eef2f7;}
        .root{display:flex;min-height:100vh;}
        .side{width:215px;background:#1a3a6b;flex-shrink:0;display:flex;flex-direction:column;}
        .main{flex:1;display:flex;flex-direction:column;min-width:0;}
        .cnt{flex:1;padding:20px 22px 32px;overflow-y:auto;}
        .slogo{padding:20px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.12);}
        .slogo-t{font-size:16px;font-weight:700;color:white;line-height:1.25;}
        .snav{flex:1;padding:8px 0;}
        .nbtn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:none;border:none;color:rgba(255,255,255,.72);font-size:14px;font-weight:500;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;border-left:3px solid transparent;transition:background .14s;}
        .nbtn .nl{display:flex;align-items:center;gap:10px;}
        .nbtn:hover{background:rgba(255,255,255,.08);color:white;}
        .nbtn.act{background:#2c5aa0;color:white;border-left-color:white;}
        .nav-badge{background:#dc2626;color:white;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;min-width:18px;text-align:center;}
        .sfoot{padding:14px 18px;border-top:1px solid rgba(255,255,255,.12);}
        .srole{font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;display:inline-block;margin-bottom:6px;}
        .srole.Admin{background:#fef3c7;color:#b45309;}
        .srole.Teller{background:#e0f2fe;color:#0369a1;}
        .suser{font-size:11px;color:rgba(255,255,255,.5);margin-bottom:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .lgout{width:100%;padding:8px;background:rgba(255,255,255,.1);border:none;border-radius:6px;color:rgba(255,255,255,.8);font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;}
        .lgout:hover{background:rgba(255,255,255,.2);}
        .tbar{background:white;border-bottom:1px solid #dde3ec;padding:13px 22px;display:flex;align-items:center;justify-content:space-between;}
        .tbar-t{font-size:20px;font-weight:700;color:#1a3a6b;}
        .tbar-r{display:flex;align-items:center;gap:10px;}
        .av{width:34px;height:34px;border-radius:50%;background:#2c5aa0;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;}
        .role-pill{font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px;}
        .role-pill.Admin{background:#fef3c7;color:#b45309;}
        .role-pill.Teller{background:#e0f2fe;color:#0369a1;}
        /* Quick cards */
        .qg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
        .qc{background:white;border-radius:10px;padding:15px 16px;border:1px solid #dde3ec;}
        .qt{display:flex;align-items:center;gap:11px;margin-bottom:12px;}
        .qi{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;}
        .qi.bl{background:#e8f0fb;}.qi.nv{background:#e8ecf5;}.qi.tl{background:#e6f4f1;}.qi.gn{background:#e8f5e9;}
        .ql{font-size:12px;font-weight:600;color:#1a3a6b;}
        .ddw{position:relative;}
        .ddb{display:flex;align-items:center;gap:5px;padding:7px 13px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;color:white;white-space:nowrap;}
        .ddb.bl{background:#2c5aa0;}.ddb.nv{background:#1a3a6b;}.ddb.tl{background:#2e7d6e;}.ddb.gn{background:#2e7d32;}
        .ddb:hover{opacity:.88;}
        .ddm{position:absolute;top:calc(100% + 4px);left:0;z-index:400;background:white;border:1px solid #dde3ec;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:190px;overflow:hidden;}
        .ddi{display:block;width:100%;padding:10px 14px;background:none;border:none;text-align:left;font-size:13px;color:#374151;cursor:pointer;font-family:'Inter',sans-serif;}
        .ddi:hover{background:#f0f4ff;color:#1a3a6b;}
        .ddi.disabled{color:#94a3b8;cursor:not-allowed;}
        /* Recent */
        .rg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
        .rb{background:white;border-radius:10px;border:1px solid #dde3ec;overflow:hidden;}
        .rh{background:#1a3a6b;color:white;padding:9px 14px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;}
        .rbg{background:rgba(255,255,255,.22);padding:1px 7px;border-radius:8px;font-size:11px;}
        .ri{display:flex;justify-content:space-between;align-items:center;padding:8px 13px;border-bottom:1px solid #f1f5f9;font-size:12px;}
        .ri:last-child{border-bottom:none;}
        .rin{font-weight:500;color:#1a3a6b;}.ris{color:#64748b;font-size:11px;margin-top:1px;}
        .riv{font-weight:600;color:#2c5aa0;font-size:12px;}
        .nr{text-align:center;color:#94a3b8;padding:16px;font-size:12px;}
        /* Chips */
        .cr{display:inline-block;background:#1a3a6b;color:white;font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;font-family:monospace;letter-spacing:.03em;}
        .cr.loan{background:#b45309;}
        .cr.green{background:#15803d;}
        /* Grid */
        .mg{display:grid;grid-template-columns:1fr 270px;gap:14px;margin-bottom:14px;}
        .bg{display:grid;grid-template-columns:1fr 1fr 270px;gap:14px;}
        .card{background:white;border-radius:10px;border:1px solid #dde3ec;overflow:hidden;}
        .ct{font-size:14px;font-weight:600;color:#1a3a6b;padding:12px 16px;border-bottom:1px solid #f0f4f8;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
        .cbg{font-size:11px;font-weight:600;background:#1a3a6b;color:white;padding:2px 8px;border-radius:10px;}
        /* Search */
        .sb2bar{display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;}
        .si{flex:1;min-width:150px;padding:8px 12px;border:1.5px solid #dde3ec;border-radius:7px;font-size:13px;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;outline:none;}
        .si:focus{border-color:#2c5aa0;}
        .ss{padding:8px 10px;border:1.5px solid #dde3ec;border-radius:7px;font-size:13px;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;outline:none;}
        .sc{padding:7px 13px;background:#f1f5f9;color:#64748b;border:1px solid #dde3ec;border-radius:7px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;}
        /* Table */
        .tbl{width:100%;border-collapse:collapse;}
        .tbl thead tr{background:#2c5aa0;}
        .tbl th{padding:9px 13px;text-align:left;font-size:12px;font-weight:600;color:white;white-space:nowrap;}
        .tbl td{padding:9px 13px;font-size:12px;color:#374151;border-bottom:1px solid #f1f5f9;}
        .tbl tr:last-child td{border-bottom:none;}
        .tbl tr:hover td{background:#f8faff;}
        .ec{text-align:center;color:#94a3b8;padding:22px!important;font-size:13px;}
        .bdg{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
        .ba{background:#dcfce7;color:#15803d;}.bi{background:#fee2e2;color:#b91c1c;}
        .bp{background:#fef3c7;color:#b45309;}.bc{background:#e0f2fe;color:#0369a1;}.br{background:#fee2e2;color:#b91c1c;}
        .bd{background:#dcfce7;color:#15803d;}.bw{background:#fee2e2;color:#b91c1c;}.bt{background:#ede9fe;color:#6d28d9;}
        .tb{padding:3px 8px;border-radius:4px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-left:2px;}
        .tb.pdf{background:#f0fdf4;color:#16a34a;}.tb.del{background:#fef2f2;color:#dc2626;}
        .tb.apr{background:#eff6ff;color:#1a56db;}.tb.rej{background:#fef2f2;color:#dc2626;}
        .pgn{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;}
        .pbs{display:flex;gap:3px;}
        .pb{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:5px;border:1px solid #dde3ec;background:white;font-size:12px;color:#374151;cursor:pointer;font-family:'Inter',sans-serif;}
        .pb.act{background:#1a3a6b;color:white;border-color:#1a3a6b;}
        /* Currency */
        .ri2{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid #f1f5f9;}
        .ri2:last-child{border-bottom:none;}
        .rl{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:500;color:#1a3a6b;}
        .rv{font-size:17px;font-weight:700;color:#e53e3e;}
        /* Loan */
        .lr{display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid #f1f5f9;}
        .lk{font-size:12px;color:#64748b;}.lv{font-size:13px;font-weight:700;color:#1a3a6b;}
        .prw{padding:7px 16px 3px;}
        .prt{height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden;}
        .prf{height:100%;border-radius:4px;transition:width .5s;}
        .prl{font-size:10px;color:#64748b;text-align:right;padding:2px 0 6px;}
        .lsel{display:flex;gap:5px;flex-wrap:wrap;padding:7px 16px;border-bottom:1px solid #f1f5f9;}
        .lpil{padding:3px 9px;border-radius:11px;border:1.5px solid #2c5aa0;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
        .lpil.s{background:#1a3a6b;color:white;border-color:#1a3a6b;}
        .lpil:not(.s){background:white;color:#2c5aa0;}
        /* Pay EMI */
        .ps{padding:13px 16px;border-top:2px solid #1a3a6b;background:#f0f4fb;}
        .pt{font-size:13px;font-weight:700;color:#1a3a6b;margin-bottom:9px;}
        .pinp{width:100%;padding:8px 12px;border:1.5px solid #2c5aa0;border-radius:7px;font-size:13px;font-weight:600;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;outline:none;margin-bottom:7px;}
        .pinp:focus{border-color:#1a56db;box-shadow:0 0 0 3px rgba(44,90,160,.1);}
        .pinp::placeholder{color:#94a3b8;font-weight:400;}
        .pr2{display:flex;gap:7px;align-items:center;margin-bottom:7px;}
        .pbtn{padding:8px 16px;background:#1a3a6b;color:white;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;}
        .pbtn:hover{background:#2c5aa0;}
        .phint{font-size:11px;color:#64748b;margin-top:4px;}
        .pres{margin-top:9px;padding:10px 12px;background:#dcfce7;border-radius:7px;border:1px solid #bbf7d0;}
        .prr{display:flex;justify-content:space-between;font-size:12px;color:#15803d;margin-bottom:3px;}
        .prr:last-child{margin-bottom:0;font-weight:700;}
        .prc{margin-top:5px;text-align:center;font-weight:700;color:#15803d;font-size:13px;}
        .eh{padding:8px 16px;font-size:11px;font-weight:700;color:#1a3a6b;background:#f8faff;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;text-transform:uppercase;letter-spacing:.04em;}
        .er{display:flex;justify-content:space-between;align-items:center;padding:7px 16px;border-bottom:1px solid #f1f5f9;font-size:11px;}
        .er:last-child{border-bottom:none;}
        .ep{color:#16a34a;font-weight:700;font-size:10px;background:#dcfce7;padding:2px 6px;border-radius:4px;}
        /* Summary */
        .sg{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;}
        .sb2{border-radius:8px;padding:12px 14px;color:white;}
        .sb2.bl{background:#2c5aa0;}.sb2.nv{background:#1a3a6b;}.sb2.gn{background:#2e7d32;}.sb2.rd{background:#c0392b;}
        .sl{font-size:11px;opacity:.9;margin-bottom:5px;}.sv{font-size:18px;font-weight:700;}
        .txm{border-top:1px solid #f1f5f9;}
        .txh{padding:9px 13px;font-size:13px;font-weight:600;color:#1a3a6b;border-bottom:1px solid #f1f5f9;}
        .txr{display:flex;justify-content:space-between;align-items:center;padding:7px 13px;border-bottom:1px solid #f8faff;font-size:12px;}
        .txr:last-child{border:none;}
        /* Reports */
        .rpg{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;}
        .rpb{background:#f8faff;border:1px solid #dde3ec;border-radius:8px;padding:11px;text-align:center;}
        .rpi{font-size:21px;margin-bottom:4px;}.rpn{font-size:11px;font-weight:600;color:#1a3a6b;margin-bottom:5px;}
        .rpbtn{width:100%;padding:6px 0;background:#1a3a6b;color:white;border:none;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-bottom:4px;}
        .rpbtn:hover{background:#2c5aa0;}
        .csv-btn{width:100%;padding:5px 0;background:#16a34a;color:white;border:none;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
        .csv-btn:hover{background:#15803d;}
        .lss{border-top:1px solid #f1f5f9;padding:11px 13px;}
        .lsh{font-size:13px;font-weight:600;color:#1a3a6b;margin-bottom:7px;}
        .lsr{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;}
        .balcell{font-weight:700;color:#1a3a6b;}
        .balcell.low{color:#dc2626;}
        /* Fraud / Audit */
        .fraud-alert{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-bottom:10px;}
        .fraud-alert-t{font-size:13px;font-weight:700;color:#b91c1c;margin-bottom:8px;}
        .fraud-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #fee2e2;font-size:12px;}
        .fraud-item:last-child{border-bottom:none;}
        .audit-filter{display:flex;gap:8px;padding:10px 14px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;}
        .audit-row{display:grid;grid-template-columns:auto 1fr 1fr 1fr 2fr;gap:8px;padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;align-items:center;}
        .audit-row:last-child{border-bottom:none;}
        .audit-action{font-weight:600;color:#1a3a6b;}
        /* Loan type cards */
        .lt-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
        .lt-card{border:2px solid #dde3ec;border-radius:12px;padding:14px;cursor:pointer;transition:all .2s;background:white;}
        .lt-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1);}
        .lt-icon{font-size:28px;margin-bottom:6px;}
        .lt-name{font-size:13px;font-weight:700;color:#1a3a6b;margin-bottom:3px;}
        .lt-desc{font-size:11px;color:#64748b;margin-bottom:6px;}
        .lt-rate{font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-block;}
        .lt-range{font-size:10px;color:#94a3b8;margin-top:4px;}
        .emi-calc{border-radius:10px;padding:12px 14px;margin-bottom:12px;}
        .emi-calc-t{font-size:12px;font-weight:700;margin-bottom:8px;}
        .emi-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;}
        .emi-row.tot{border-top:1px solid rgba(0,0,0,.1);margin-top:6px;padding-top:6px;font-weight:700;}
        /* Customer summary */
        .csbox{background:#f0f4fb;border-radius:8px;padding:12px 14px;margin-top:10px;border:1px solid #dde3ec;}
        .csbox-t{font-size:12px;font-weight:700;color:#1a3a6b;margin-bottom:8px;}
        .csgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .csitem{background:white;border-radius:6px;padding:8px 10px;border:1px solid #e2e8f0;}
        .csitem-l{font-size:10px;color:#64748b;margin-bottom:2px;}
        .csitem-v{font-size:13px;font-weight:700;color:#1a3a6b;}
        .lt-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;}
        /* Step indicator */
        .step-hd{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
        .step-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
        .step-dot.act{background:#1a3a6b;color:white;}
        .step-dot.done{background:#15803d;color:white;}
        .step-dot.wait{background:#e2e8f0;color:#94a3b8;}
        .step-line{flex:1;height:2px;background:#e2e8f0;}
        /* Modal */
        .ovl{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(2px);}
        .mdl{background:white;border-radius:12px;padding:26px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;animation:mup .2s ease;}
        @keyframes mup{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
        .mtt{font-size:16px;font-weight:700;color:#1a3a6b;margin-bottom:16px;}
        .ml{font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;display:block;text-transform:uppercase;letter-spacing:.04em;}
        .mi,.ms{width:100%;padding:9px 11px;border:1.5px solid #dde3ec;border-radius:8px;font-size:14px;color:#1e293b;background:#f8fafc;font-family:'Inter',sans-serif;margin-bottom:11px;outline:none;transition:border-color .15s;}
        .mi:focus,.ms:focus{border-color:#2c5aa0;background:white;}
        .mf{display:flex;gap:9px;margin-top:4px;}
        .mb{flex:1;padding:10px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
        .mb.p{background:#1a3a6b;color:white;}.mb.p:hover{background:#2c5aa0;}
        .mb.c{background:#f1f5f9;color:#64748b;}
        .note{background:#eff6ff;border-radius:8px;padding:9px 13px;margin-bottom:11px;font-size:13px;color:#1e40af;line-height:1.5;}
        .suc{background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:14px;text-align:center;}
        .suc-t{font-size:13px;font-weight:700;color:#15803d;margin-bottom:8px;}
        .suc-id{font-size:20px;font-weight:700;color:#1a3a6b;font-family:monospace;background:white;border:2px solid #2c5aa0;border-radius:8px;padding:8px 18px;display:inline-block;margin-bottom:6px;letter-spacing:2px;}
        .suc-s{font-size:12px;color:#64748b;}
        .tst{position:fixed;bottom:24px;right:24px;z-index:9999;padding:11px 17px;border-radius:9px;font-size:13px;font-weight:500;box-shadow:0 8px 28px rgba(0,0,0,.18);max-width:400px;animation:tin .22s ease;}
        .tst.success{background:#1a3a6b;color:white;}.tst.error{background:#b91c1c;color:white;}
        @keyframes tin{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        .ls2{position:fixed;inset:0;background:rgba(238,242,247,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9998;gap:13px;}
        .sp{width:36px;height:36px;border:4px solid #dde3ec;border-top-color:#2c5aa0;border-radius:50%;animation:spin .75s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .lt2{font-size:14px;color:#64748b;font-weight:500;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#c8d0dc;border-radius:3px;}
      `}</style>

      {loading&&<div className="ls2"><div className="sp"/><div className="lt2">Loading Bank System...</div></div>}

      <div className="root">
        {/* Sidebar */}
        <aside className="side">
          <div className="slogo"><span style={{fontSize:21}}>🏛</span><span className="slogo-t">Bank<br/>System</span></div>
          <nav className="snav">
            {navItems.map(n=>(
              <button key={n.label} className={`nbtn ${activeNav===n.label?'act':''}`} onClick={()=>setActiveNav(n.label)}>
                <span className="nl"><span>{n.icon}</span>{n.label}</span>
                {n.badge>0&&<span className="nav-badge">{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sfoot">
            <div><span className={`srole ${userRole}`}>{userRole}</span></div>
            <div className="suser">{fullName}</div>
            <button className="lgout" onClick={logout}>⎋ &nbsp;Logout</button>
          </div>
        </aside>

        <div className="main">
          <div className="tbar">
            <div className="tbar-t">Bank System</div>
            <div className="tbar-r">
              <span className={`role-pill ${userRole}`}>{userRole}</span>
              <div className="av">{fullName.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}</div>
              <span style={{fontSize:13,color:'#64748b'}}>{fullName}</span>
            </div>
          </div>

          <div className="cnt">

            {/* Quick cards */}
            <div className="qg">
              {[
                {key:'cust',cls:'bl',icon:'👤',title:'Customer Registration',label:'Add Customer ▾',items:[{t:'➕ Add New Customer',fn:()=>openModal('customer')},{t:'👥 View All Customers',fn:()=>setActiveNav('Customer')},{t:'🔍 Customer Summary',fn:()=>openModal('summary')}]},
                {key:'acc', cls:'nv',icon:'🏦',title:'Account Creation',label:'Create Account ▾',items:[{t:'➕ Create Account',fn:()=>openModal('account')},{t:'📋 View Accounts',fn:()=>setActiveNav('Account')}]},
                {key:'tx',  cls:'tl',icon:'⇄', title:'Transactions',label:'New Transaction ▾',items:[{t:'➕ New Transaction',fn:()=>openModal('transaction')},{t:'📋 All Transactions',fn:()=>setActiveNav('Transaction')}]},
                {key:'loan',cls:'gn',icon:'💳',title:'Loan Management',label:'Manage Loans ▾',items:[{t:'➕ Apply for Loan',fn:()=>openModal('loan')},{t:'💳 Pay EMI',fn:()=>openModal('payemi')},{t:'📋 View All Loans',fn:()=>setActiveNav('Loan')},...(isAdmin?loans.filter(l=>l.status==='Pending').map(l=>({t:`✅ Approve: ${l.loanNo}`,fn:()=>doApprove(l.loanId)})):[{t:'ℹ️ Admin approves loans',fn:()=>{},disabled:true}])]},
              ].map(q=>(
                <div key={q.key} className="qc">
                  <div className="qt"><div className={`qi ${q.cls}`}>{q.icon}</div><div className="ql">{q.title}</div></div>
                  <div className="ddw" onClick={e=>e.stopPropagation()}>
                    <button className={`ddb ${q.cls}`} onClick={()=>setDd(dd===q.key?null:q.key)}>{q.label}</button>
                    {dd===q.key&&<div className="ddm">{q.items.map((it,i)=><button key={i} className={`ddi ${it.disabled?'disabled':''}`} onClick={it.disabled?undefined:it.fn}>{it.t}</button>)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Fraud alert banner — Admin only */}
            {isAdmin && totalFraudAlerts>0 && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontWeight:700,color:'#b91c1c',fontSize:13}}>🚨 {totalFraudAlerts} Fraud Alert{totalFraudAlerts>1?'s':''} detected</span>
                <button onClick={()=>setActiveNav('Fraud Alerts')} style={{padding:'5px 14px',background:'#b91c1c',color:'white',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>View Alerts</button>
              </div>
            )}

            {/* Recent boxes */}
            <div className="rg">
              <div className="rb">
                <div className="rh">🆕 Recent Customers (10 days)<span className="rbg">{recentCusts.length}</span></div>
                {recentCusts.length===0?<div className="nr">No new customers</div>:recentCusts.slice(0,5).map(c=>(
                  <div key={c.customerId} className="ri"><div><div className="rin">{c.fullName}</div><div className="ris">{c.phone||c.email}</div></div><span className="cr">{c.customerNo}</span></div>
                ))}
              </div>
              <div className="rb">
                <div className="rh">🆕 Recent Accounts (10 days)<span className="rbg">{recentAccs.length}</span></div>
                {recentAccs.length===0?<div className="nr">No new accounts</div>:recentAccs.slice(0,5).map((a,i)=>(
                  <div key={i} className="ri"><div><div className="rin">{a.accountType}</div><div className="ris">{a.customerName} | {a.customerNo}</div></div><span className="riv">LKR {parseFloat(a.balance).toLocaleString()}</span></div>
                ))}
              </div>
              <div className="rb">
                <div className="rh">🆕 Recent Transactions (10 days)<span className="rbg">{recentTxs.length}</span></div>
                {recentTxs.length===0?<div className="nr">No recent transactions</div>:recentTxs.slice(0,5).map(t=>{
                  const p=t.type==='Deposit'||t.type==='Transfer In';
                  return <div key={t.transactionId} className="ri"><div><div className="rin">{t.description||t.type}</div><div className="ris">{t.createdAt?.slice(0,10)} | {t.customerNo||''}</div></div><span style={{fontWeight:600,color:p?'#16a34a':'#dc2626',fontSize:12}}>{p?'+':'−'}LKR {parseFloat(t.amount).toLocaleString()}</span></div>;
                })}
              </div>
            </div>

            {/* Customer table */}
            {(activeNav==='Dashboard'||activeNav==='Customer')&&(
              <div className="card" style={{marginBottom:14}}>
                <div className="ct">Customer List<span className="cbg">{filtered.length}</span></div>
                <div className="sb2bar">
                  <input className="si" placeholder="Search by name, phone, or CR number..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
                  <select className="ss" value={statusFil} onChange={e=>{setStatusFil(e.target.value);setPage(1);}}>
                    <option value="All">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
                  </select>
                  <button className="sc" onClick={()=>{setSearch('');setStatusFil('All');setPage(1);}}>Clear</button>
                  {isAdmin&&<button onClick={()=>exportCSV('Customer')} style={{padding:'7px 13px',background:'#16a34a',color:'white',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>📥 CSV</button>}
                </div>
                <table className="tbl">
                  <thead><tr><th>CR Number</th><th>Name</th><th>Email</th><th>Phone</th><th>Account Balance</th><th>Accounts</th><th>Loans</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pageC.length===0?<tr><td colSpan={10} className="ec">No customers found</td></tr>
                    :pageC.map(c=>(
                      <tr key={c.customerId}>
                        <td><span className="cr">{c.customerNo}</span></td>
                        <td style={{fontWeight:500}}>{c.fullName}</td>
                        <td style={{color:'#64748b',fontSize:11}}>{c.email}</td>
                        <td>{c.phone||'—'}</td>
                        <td><span className={`balcell ${(c.balance||0)<1000?'low':''}`}>LKR {(c.balance||0).toLocaleString('en-LK',{minimumFractionDigits:2})}</span></td>
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
              <div className="card" style={{marginBottom:14}}>
                <div className="ct">All Accounts<span className="cbg">{allAccounts.length}</span></div>
                <table className="tbl">
                  <thead><tr><th>Account No</th><th>CR Number</th><th>Customer</th><th>Type</th><th>Balance</th><th>Created</th></tr></thead>
                  <tbody>
                    {allAccounts.length===0?<tr><td colSpan={6} className="ec">No accounts</td></tr>
                    :allAccounts.map(a=>(
                      <tr key={a.accountId}><td style={{fontFamily:'monospace',fontWeight:600}}>{a.accountNumber}</td><td><span className="cr">{a.customerNo}</span></td><td>{a.customerName}</td><td>{a.accountType}</td><td><span className="balcell">LKR {parseFloat(a.balance).toLocaleString('en-LK',{minimumFractionDigits:2})}</span></td><td style={{color:'#64748b',fontSize:11}}>{new Date(a.createdAt).toLocaleDateString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeNav==='Transaction'&&(
              <div className="card" style={{marginBottom:14}}>
                <div className="ct">
                  All Transactions<span className="cbg">{transactions.length}</span>
                  {isAdmin&&<div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                    <input type="date" value={csvFrom} onChange={e=>setCsvFrom(e.target.value)} style={{padding:'4px 8px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}} title="From date"/>
                    <input type="date" value={csvTo} onChange={e=>setCsvTo(e.target.value)} style={{padding:'4px 8px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}} title="To date"/>
                    <select value={csvTxType} onChange={e=>setCsvTxType(e.target.value)} style={{padding:'4px 8px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}}>
                      <option value="">All Types</option><option>Deposit</option><option>Withdrawal</option><option>Transfer In</option><option>Transfer Out</option>
                    </select>
                    <button onClick={()=>exportCSV('Transaction')} style={{padding:'5px 12px',background:'#16a34a',color:'white',border:'none',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>📥 Export CSV</button>
                  </div>}
                </div>
                <table className="tbl">
                  <thead><tr><th>ID</th><th>Type</th><th>CR Number</th><th>Customer</th><th>Description</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>
                    {transactions.length===0?<tr><td colSpan={7} className="ec">No transactions</td></tr>
                    :transactions.slice(0,50).map(t=>{
                      const p=t.type==='Deposit'||t.type==='Transfer In';
                      const cl=t.type==='Deposit'?'bd':t.type?.includes('Transfer')?'bt':'bw';
                      return <tr key={t.transactionId}><td>T{String(t.transactionId).padStart(3,'0')}</td><td><span className={`bdg ${cl}`}>{t.type}</span></td><td><span className="cr">{t.customerNo||'—'}</span></td><td>{t.customer||'—'}</td><td style={{color:'#64748b'}}>{t.description}</td><td style={{fontWeight:600,color:p?'#16a34a':'#dc2626'}}>{p?'+':'−'}LKR {parseFloat(t.amount).toLocaleString()}</td><td style={{color:'#64748b'}}>{t.createdAt?.slice(0,10)}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeNav==='Loan'&&(
              <div className="card" style={{marginBottom:14}}>
                <div className="ct">
                  All Loans<span className="cbg">{loans.length}</span>
                  {isAdmin&&<div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <select value={csvLoanType} onChange={e=>setCsvLoanType(e.target.value)} style={{padding:'4px 8px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}}>
                      <option value="">All Types</option>{LOAN_TYPES.map(l=><option key={l.type}>{l.type}</option>)}
                    </select>
                    <select value={csvLoanStatus} onChange={e=>setCsvLoanStatus(e.target.value)} style={{padding:'4px 8px',border:'1px solid #dde3ec',borderRadius:5,fontSize:12}}>
                      <option value="">All Status</option><option>Pending</option><option>Active</option><option>Completed</option><option>Rejected</option>
                    </select>
                    <button onClick={()=>exportCSV('Loan')} style={{padding:'5px 12px',background:'#16a34a',color:'white',border:'none',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>📥 Export CSV</button>
                  </div>}
                </div>
                <table className="tbl">
                  <thead><tr><th>Loan ID</th><th>Loan Type</th><th>CR Number</th><th>Customer</th><th>Amount</th><th>Rate</th><th>Monthly EMI</th><th>Total Payable</th><th>Months</th><th>Status</th><th>Progress</th><th>Actions</th></tr></thead>
                  <tbody>
                    {loans.length===0?<tr><td colSpan={12} className="ec">No loans</td></tr>
                    :loans.map(l=>{
                      const lt=LOAN_TYPES.find(x=>x.type===l.loanType)||LOAN_TYPES[0];
                      return <tr key={l.loanId}>
                        <td><span className="cr loan">{l.loanNo}</span></td>
                        <td><span className="lt-badge" style={{background:lt.bg,color:lt.color}}>{lt.icon} {l.loanType}</span></td>
                        <td><span className="cr">{l.customerNo}</span></td>
                        <td style={{fontWeight:500}}>{l.customerName}</td>
                        <td>LKR {parseFloat(l.amount).toLocaleString()}</td>
                        <td style={{fontWeight:600,color:lt.color}}>{l.interestRate}%</td>
                        <td>LKR {parseFloat(l.monthlyPayment).toLocaleString()}</td>
                        <td style={{fontWeight:600}}>LKR {parseFloat(l.totalPayable||l.amount).toLocaleString()}</td>
                        <td>{l.months}mo</td>
                        <td><span className={`bdg ${l.status==='Active'?'ba':l.status==='Pending'?'bp':l.status==='Rejected'?'br':'bc'}`}>{l.status}</span></td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <div style={{flex:1,height:5,background:'#e2e8f0',borderRadius:3,overflow:'hidden',minWidth:40}}>
                              <div style={{height:'100%',width:`${l.progress}%`,background:lt.color,borderRadius:3}}/>
                            </div>
                            <span style={{fontSize:11,color:'#64748b'}}>{l.progress}%</span>
                          </div>
                        </td>
                        <td>
                          {isAdmin&&l.status==='Pending'&&<>
                            <button className="tb apr" onClick={()=>doApprove(l.loanId)}>Approve</button>
                            <button className="tb rej" onClick={()=>doReject(l.loanId)}>Reject</button>
                          </>}
                          {!isAdmin&&l.status==='Pending'&&<span style={{fontSize:10,color:'#94a3b8'}}>Awaiting Admin</span>}
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Audit Log — Admin only ── */}
            {activeNav==='Audit Log'&&isAdmin&&(
              <div className="card" style={{marginBottom:14}}>
                <div className="ct">Audit Log<span className="cbg">{auditLogs.length}</span></div>
                <div className="audit-filter">
                  <select className="ss" onChange={e=>{ /* filter in state */ }}>
                    <option value="">All Entities</option><option>Loan</option><option>Customer</option><option>Transaction</option>
                  </select>
                </div>
                {auditLogs.length===0?<div className="nr">No audit logs yet</div>
                :auditLogs.map(a=>(
                  <div key={a.auditId} className="audit-row">
                    <span style={{color:'#64748b',fontSize:11,whiteSpace:'nowrap'}}>{new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                    <span className="audit-action">{a.action}</span>
                    <span><span className="cr" style={{fontSize:10}}>{a.entityId}</span></span>
                    <span><span className={`role-pill ${a.userRole}`} style={{fontSize:10}}>{a.userRole}</span> {a.performedBy}</span>
                    <span style={{color:'#64748b',fontSize:11}}>{a.details}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Fraud Alerts — Admin only ── */}
            {activeNav==='Fraud Alerts'&&isAdmin&&(
              <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:14}}>
                <div className="card">
                  <div className="ct" style={{background:'#fef2f2'}}>🚨 Large Transactions (≥ LKR 100,000)<span className="cbg" style={{background:'#b91c1c'}}>{fraudAlerts.large.length}</span></div>
                  {fraudAlerts.large.length===0?<div className="nr">No large transactions</div>
                  :fraudAlerts.large.map(t=>(
                    <div key={t.transactionId} className="fraud-item" style={{padding:'8px 14px',borderBottom:'1px solid #fee2e2'}}>
                      <span className="cr">{t.customerNo}</span>
                      <span style={{fontWeight:500}}>{t.customerName}</span>
                      <span className={`bdg ${t.type==='Deposit'?'bd':'bw'}`}>{t.type}</span>
                      <span style={{fontWeight:700,color:'#b91c1c'}}>LKR {parseFloat(t.amount).toLocaleString()}</span>
                      <span style={{color:'#64748b',fontSize:11}}>{t.createdAt?.slice(0,10)}</span>
                      <span>⚠️ Large Tx</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="ct" style={{background:'#fef2f2'}}>🚨 Suspicious Activity (Multiple Large Withdrawals Today)<span className="cbg" style={{background:'#b91c1c'}}>{fraudAlerts.suspicious.length}</span></div>
                  {fraudAlerts.suspicious.length===0?<div className="nr">No suspicious activity today</div>
                  :fraudAlerts.suspicious.map((s,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid #fee2e2',fontSize:13}}>
                      <span className="cr">{s.customerNo}</span>
                      <span style={{fontWeight:500}}>{s.customerName}</span>
                      <span style={{color:'#b91c1c',fontWeight:700}}>{s.txCount} withdrawals today</span>
                      <span style={{fontWeight:700}}>LKR {parseFloat(s.totalAmount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="ct" style={{background:'#fef3c7'}}>⚠️ Delinquent Loans (No EMI in 35+ days)<span className="cbg" style={{background:'#b45309'}}>{fraudAlerts.delinquent.length}</span></div>
                  {fraudAlerts.delinquent.length===0?<div className="nr">No delinquent loans</div>
                  :fraudAlerts.delinquent.map(l=>(
                    <div key={l.loanNo} style={{display:'flex',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid #fef3c7',fontSize:13,flexWrap:'wrap',gap:6}}>
                      <span className="cr loan">{l.loanNo}</span>
                      <span className="cr">{l.customerNo}</span>
                      <span style={{fontWeight:500}}>{l.customerName}</span>
                      <span style={{color:'#b45309',fontWeight:700}}>LKR {parseFloat(l.monthlyPayment).toLocaleString()}/mo</span>
                      <span style={{fontSize:11,color:'#64748b'}}>Last: {l.lastPayment?new Date(l.lastPayment).toLocaleDateString():'Never paid'}</span>
                      <span>⚠️ Overdue</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main grid */}
            <div className="mg">
              <div className="card">
                <div className="ct">Active Customers<span className="cbg">{customers.filter(c=>c.status==='Active').length}</span></div>
                <table className="tbl">
                  <thead><tr><th>CR Number</th><th>Name</th><th>Email</th><th>Balance</th><th>Status</th></tr></thead>
                  <tbody>
                    {customers.filter(c=>c.status==='Active').length===0?<tr><td colSpan={5} className="ec">No active customers</td></tr>
                    :customers.filter(c=>c.status==='Active').slice(0,7).map(c=>(
                      <tr key={c.customerId}><td><span className="cr">{c.customerNo}</span></td><td style={{fontWeight:500}}>{c.fullName}</td><td style={{color:'#64748b',fontSize:11}}>{c.email}</td><td><span className="balcell">LKR {(c.balance||0).toLocaleString()}</span></td><td><span className="bdg ba">Active</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="ct">Currency Live Rates</div>
                {[{p:'USD / EUR',r:'0.94',f:'🇪🇺'},{p:'USD / GBP',r:'0.76',f:'🇬🇧'},{p:'USD / JPY',r:'128.56',f:'🇯🇵'},{p:'USD / AUD',r:'1.35',f:'🇦🇺'}].map((x,i)=>(
                  <div key={i} className="ri2"><div className="rl"><span style={{fontSize:19}}>{x.f}</span><span>{x.p}</span></div><span className="rv">{x.r}</span></div>
                ))}
              </div>
            </div>

            {/* Bottom grid */}
            <div className="bg">
              {/* Loan overview */}
              <div className="card">
                <div className="ct">Loan Overview &amp; EMI{activeLoan&&<span className="lt-badge" style={{background:loanBg(activeLoan.loanType),color:loanColor(activeLoan.loanType),marginLeft:8}}>{loanIcon(activeLoan.loanType)} {activeLoan.loanType}</span>}</div>
                {loans.length>1&&<div className="lsel">{loans.map(l=><button key={l.loanId} className={`lpil ${selectedLoan?.loanId===l.loanId?'s':''}`} onClick={()=>{setSelectedLoan(l);setPayResult(null);}}>{loanIcon(l.loanType)} {l.loanNo}</button>)}</div>}
                {!activeLoan?<div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:13}}>No loans yet</div>:<>
                  {[
                    {k:'Loan ID',v:<span className="cr loan">{activeLoan.loanNo}</span>},
                    {k:'Loan Type',v:<span className="lt-badge" style={{background:loanBg(activeLoan.loanType),color:loanColor(activeLoan.loanType)}}>{loanIcon(activeLoan.loanType)} {activeLoan.loanType}</span>},
                    {k:'CR Number',v:<span className="cr">{activeLoan.customerNo}</span>},
                    {k:'Customer',v:activeLoan.customerName},
                    {k:'Loan Amount',v:`LKR ${parseFloat(activeLoan.amount).toLocaleString()}`},
                    {k:'Interest Rate',v:<span style={{fontWeight:700,color:loanColor(activeLoan.loanType)}}>{activeLoan.interestRate}% p.a.</span>},
                    {k:'Total Interest',v:`LKR ${parseFloat(activeLoan.totalInterest||0).toLocaleString()}`},
                    {k:'Total Payable',v:`LKR ${parseFloat(activeLoan.totalPayable||activeLoan.amount).toLocaleString()}`},
                    {k:'Monthly EMI',v:`LKR ${parseFloat(activeLoan.monthlyPayment||0).toLocaleString()}`},
                    {k:'Period',v:`${activeLoan.months} months`},
                    {k:'Status',v:activeLoan.status},
                  ].map((r,i)=>(
                    <div key={i} className="lr"><span className="lk">{r.k}</span>
                      <span className="lv" style={{color:r.k==='Status'?(activeLoan.status==='Active'?'#16a34a':activeLoan.status==='Pending'?'#b45309':'#64748b'):'#1a3a6b'}}>{r.v}</span>
                    </div>
                  ))}
                  <div className="prw"><div className="prt"><div className="prf" style={{width:`${activeLoan.progress}%`,background:loanColor(activeLoan.loanType)}}/></div><div className="prl">{activeLoan.progress}% repaid</div></div>
                  {activeLoan.status==='Active'&&<div className="ps">
                    <div className="pt">💳 Pay EMI — {loanIcon(activeLoan.loanType)} {activeLoan.loanType}</div>
                    <input className="pinp" placeholder="Loan ID e.g. LN10000001" type="text" value={form.emiLoanNo||''} onChange={e=>setForm(f=>({...f,emiLoanNo:e.target.value.toUpperCase()}))}/>
                    <input className="pinp" placeholder="CR Number e.g. CR10000001" type="text" value={form.emiCrNo||''} onChange={e=>setForm(f=>({...f,emiCrNo:e.target.value.toUpperCase()}))}/>
                    <div className="pr2">
                      <input className="pinp" style={{marginBottom:0}} placeholder={`Amount e.g. LKR ${parseFloat(activeLoan.monthlyPayment||0).toLocaleString()}`} type="text" inputMode="decimal" value={form.emiAmount||''} onChange={e=>setForm(f=>({...f,emiAmount:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&doPayEmi()}/>
                      <button className="pbtn" onClick={doPayEmi}>Pay Now</button>
                    </div>
                    <input className="pinp" placeholder="Note (optional)" value={form.emiNote||''} onChange={e=>setForm(f=>({...f,emiNote:e.target.value}))}/>
                    <div className="phint">✅ Amount deducted from the CR number's account automatically</div>
                    {payResult&&<div className="pres">
                      <div className="prr"><span>Loan ID</span><span>{payResult.loanNo}</span></div>
                      <div className="prr"><span>Loan Type</span><span>{payResult.loanType}</span></div>
                      <div className="prr"><span>Amount Paid</span><span>LKR {parseFloat(payResult.amountPaid||0).toLocaleString()}</span></div>
                      <div className="prr"><span>New Balance</span><span style={{color:'#dc2626'}}>LKR {parseFloat(payResult.newBalance||0).toLocaleString()}</span></div>
                      <div className="prr"><span>Total Paid</span><span>LKR {parseFloat(payResult.totalPaid||0).toLocaleString()}</span></div>
                      <div className="prr"><span>Remaining</span><span>LKR {parseFloat(payResult.remaining||0).toLocaleString()}</span></div>
                      <div className="prr"><span>Progress</span><span>{payResult.loanProgress}%</span></div>
                      {payResult.loanStatus==='Completed'&&<div className="prc">🎉 Loan Fully Repaid!</div>}
                    </div>}
                  </div>}
                  {activeLoan.emiPayments?.length>0&&<>
                    <div className="eh">EMI History ({activeLoan.emiPayments.length})</div>
                    {[...activeLoan.emiPayments].sort((a,b)=>new Date(b.paidAt)-new Date(a.paidAt)).map((e,i)=>(
                      <div key={i} className="er"><span style={{color:'#64748b'}}>{new Date(e.paidAt).toLocaleDateString()} {new Date(e.paidAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><span style={{fontWeight:600}}>LKR {parseFloat(e.amount).toLocaleString()}</span><span style={{color:'#94a3b8',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.note}</span><span className="ep">✓</span></div>
                    ))}
                  </>}
                </>}
              </div>

              {/* Summary */}
              <div className="card">
                <div className="ct">Account &amp; Transaction Summary</div>
                <div className="sg">
                  <div className="sb2 bl"><div className="sl">Total Accounts</div><div className="sv">{summary.totalAccounts}</div></div>
                  <div className="sb2 nv"><div className="sl">Total Deposits</div><div className="sv" style={{fontSize:13}}>LKR {Math.round(summary.totalDeposits).toLocaleString()}</div></div>
                  <div className="sb2 gn"><div className="sl">Transactions</div><div className="sv">{summary.totalTransactions}</div></div>
                  <div className="sb2 rd"><div className="sl">Withdrawals</div><div className="sv" style={{fontSize:13}}>LKR {Math.round(summary.totalWithdrawals).toLocaleString()}</div></div>
                </div>
                <div className="txm">
                  <div className="txh">Recent Transactions</div>
                  {transactions.length===0?<div style={{padding:'9px 13px',fontSize:12,color:'#94a3b8'}}>No transactions</div>
                  :transactions.slice(0,5).map(t=>{
                    const p=t.type==='Deposit'||t.type==='Transfer In';
                    return <div key={t.transactionId} className="txr">
                      <div><span style={{color:'#374151'}}>{t.description||t.type}</span>{t.customerNo&&<span style={{marginLeft:6}}><span className="cr" style={{fontSize:10,padding:'1px 5px'}}>{t.customerNo}</span></span>}</div>
                      <span style={{fontWeight:600,color:p?'#16a34a':'#dc2626'}}>{p?'+':'−'}LKR {parseFloat(t.amount).toLocaleString()}</span>
                    </div>;
                  })}
                </div>
              </div>

              {/* Reports */}
              <div className="card">
                <div className="ct">Reports &amp; Export</div>
                <div className="rpg">
                  {[
                    {n:'Customer',t:'Customer',d:customers},
                    {n:'Account',t:'Account',d:allAccounts},
                    {n:'Loan',t:'Loan',d:loans},
                    {n:'Transaction',t:'Transaction',d:transactions},
                  ].map(r=>(
                    <div key={r.t} className="rpb">
                      <div className="rpi">📄</div>
                      <div className="rpn">{r.n}</div>
                      <button className="rpbtn" onClick={()=>printBulk(r.t,r.d)}>🖨 Print PDF</button>
                      {isAdmin&&<button className="csv-btn" onClick={()=>exportCSV(r.t)}>📥 Export CSV</button>}
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
                <div className="note">✅ CR number auto-generated. No manual entry needed.</div>
                <label className="ml">Full Name *</label><input className="mi" placeholder="John Smith" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/>
                <label className="ml">Email *</label><input className="mi" placeholder="john@email.com" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/>
                <label className="ml">Phone</label><input className="mi" placeholder="0771234567" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/>
                <div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={doNewCustomer}>Create Customer</button></div>
              </>:<>
                <div className="suc"><div className="suc-t">✅ Customer Created!</div><div style={{fontSize:12,color:'#64748b',marginBottom:8}}>Auto-generated CR Number:</div><div className="suc-id">{newCustRes.customerNo}</div><div className="suc-s">Use this CR number for all operations</div></div>
                <div className="mf"><button className="mb p" onClick={closeModal}>Done</button></div>
              </>}
            </>}

            {modal==='summary'&&<>
              <div className="mtt">🔍 Customer Summary</div>
              <label className="ml">Enter CR Number</label>
              <div style={{display:'flex',gap:8,marginBottom:11}}>
                <input className="mi" style={{marginBottom:0}} placeholder="e.g. CR10000001" value={form.sumCr||''} onChange={e=>setForm({...form,sumCr:e.target.value.toUpperCase()})}/>
                <button className="mb p" style={{flex:'0 0 auto',padding:'9px 16px'}} onClick={()=>loadCustSummary(form.sumCr)}>{summLoad?'...':'Search'}</button>
              </div>
              {custSummary&&<>
                <div className="csbox">
                  <div className="csbox-t">Summary for {custSummary.customerNo}</div>
                  <div className="csgrid">
                    {[{l:'CR Number',v:custSummary.customerNo},{l:'Name',v:custSummary.fullName},{l:'Phone',v:custSummary.phone||'—'},{l:'Status',v:custSummary.status},{l:'Balance',v:`LKR ${(custSummary.balance||0).toLocaleString()}`},{l:'Accounts',v:custSummary.accounts?.length||0},{l:'Total Loans',v:custSummary.totalLoans||0},{l:'Active Loans',v:custSummary.activeLoans||0}].map((x,i)=>(
                      <div key={i} className="csitem"><div className="csitem-l">{x.l}</div><div className="csitem-v" style={x.l==='Balance'?{color:'#16a34a'}:x.l==='Active Loans'&&custSummary.activeLoans>0?{color:'#dc2626'}:{}}>{x.v}</div></div>
                    ))}
                  </div>
                  {custSummary.accounts?.map((a,i)=>(
                    <div key={i} style={{background:'white',borderRadius:6,padding:'8px 10px',marginTop:8,border:'1px solid #e2e8f0',fontSize:12}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:600,color:'#1a3a6b'}}>{a.accountType}</span><span style={{fontWeight:700,color:'#16a34a'}}>LKR {parseFloat(a.balance).toLocaleString()}</span></div>
                      <div style={{color:'#64748b',fontSize:11,marginTop:2}}>#{a.accountNumber}</div>
                    </div>
                  ))}
                </div>
                <button className="mb p" style={{width:'100%',marginTop:10}} onClick={()=>doPDF(custSummary.customerId)}>🖨 Print PDF</button>
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
              <div style={{fontSize:12,color:'#64748b',marginBottom:14,textAlign:'center'}}>{loanStep===1?'Step 1: Select Loan Type':'Step 2: Enter Loan Details'}</div>
              {!newLoanRes?<>
                {loanStep===1&&<>
                  <div className="lt-grid">
                    {LOAN_TYPES.map(lt=>(
                      <div key={lt.type} className={`lt-card ${selType?.type===lt.type?'sel':''}`} style={selType?.type===lt.type?{borderColor:lt.color,background:lt.bg}:{}} onClick={()=>setSelType(lt)}>
                        <div className="lt-icon">{lt.icon}</div>
                        <div className="lt-name">{lt.type}</div>
                        <div className="lt-desc">{lt.desc}</div>
                        <div className="lt-rate" style={{background:lt.color,color:'white'}}>{lt.rate}% p.a.</div>
                        <div className="lt-range">LKR {lt.min.toLocaleString()} – {lt.max.toLocaleString()} | {lt.minM}–{lt.maxM} mo</div>
                      </div>
                    ))}
                  </div>
                  <div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={()=>{if(!selType){toast$('❌ Select a loan type','error');return;}setLoanStep(2);}} disabled={!selType}>Next →</button></div>
                </>}
                {loanStep===2&&<>
                  <div style={{background:selType.bg,borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10,border:`1.5px solid ${selType.color}`}}>
                    <span style={{fontSize:24}}>{selType.icon}</span>
                    <div><div style={{fontWeight:700,color:selType.color}}>{selType.type}</div><div style={{fontSize:12,color:'#64748b'}}>{selType.rate}% p.a. | {selType.minM}–{selType.maxM} months</div></div>
                    <button onClick={()=>setLoanStep(1)} style={{marginLeft:'auto',padding:'4px 10px',background:'none',border:`1px solid ${selType.color}`,borderRadius:6,color:selType.color,fontSize:11,cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:600}}>Change</button>
                  </div>
                  <div className="note">⚠️ Customer must have an account. Loan ID is auto-generated.</div>
                  <label className="ml">CR Number *</label><input className="mi" placeholder="e.g. CR10000001" value={form.crNo||''} onChange={e=>setForm({...form,crNo:e.target.value.toUpperCase()})}/>
                  <label className="ml">Loan Amount (LKR) *</label><input className="mi" placeholder={`e.g. ${selType.min.toLocaleString()}`} type="text" inputMode="decimal" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/>
                  <label className="ml">Repayment Period ({selType.minM}–{selType.maxM} months)</label>
                  <select className="ms" value={form.months||String(selType.minM)} onChange={e=>setForm({...form,months:e.target.value})}>
                    {Array.from({length:Math.floor((selType.maxM-selType.minM)/6)+1},(_,i)=>selType.minM+i*6).map(m=><option key={m} value={m}>{m} months ({Math.floor(m/12)}yr {m%12>0?m%12+'mo':''})</option>)}
                  </select>
                  {emiPreview&&(
                    <div className="emi-calc" style={{background:selType.bg,border:`1px solid ${selType.color}`}}>
                      <div className="emi-calc-t" style={{color:selType.color}}>{selType.icon} EMI Preview</div>
                      <div className="emi-row"><span style={{color:'#64748b'}}>Principal</span><span style={{fontWeight:600}}>LKR {parseFloat(form.amount).toLocaleString()}</span></div>
                      <div className="emi-row"><span style={{color:'#64748b'}}>Rate</span><span style={{fontWeight:600,color:selType.color}}>{selType.rate}% p.a.</span></div>
                      <div className="emi-row"><span style={{color:'#64748b'}}>Total Interest</span><span style={{color:'#dc2626',fontWeight:600}}>LKR {emiPreview.totalInterest.toLocaleString()}</span></div>
                      <div className="emi-row tot"><span>Total Payable</span><span>LKR {emiPreview.totalPayable.toLocaleString()}</span></div>
                      <div className="emi-row" style={{marginTop:4}}><span style={{color:'#64748b'}}>Monthly EMI</span><span style={{fontWeight:700,fontSize:15,color:selType.color}}>LKR {emiPreview.monthly.toLocaleString()}</span></div>
                    </div>
                  )}
                  <div className="mf"><button className="mb c" onClick={()=>setLoanStep(1)}>← Back</button><button className="mb p" onClick={doNewLoan}>Apply Now</button></div>
                </>}
              </>:<>
                <div className="suc">
                  <div className="suc-t">✅ Loan Submitted!</div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:4}}>Loan Type: {newLoanRes.loanType}</div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>Auto-generated Loan ID:</div>
                  <div className="suc-id">{newLoanRes.loanNo}</div>
                  <div className="suc-s">Rate: {newLoanRes.interestRate}% | EMI: LKR {parseFloat(newLoanRes.monthly||0).toLocaleString()} | Total: LKR {parseFloat(newLoanRes.totalPayable||0).toLocaleString()}</div>
                  <div className="suc-s" style={{marginTop:6,color:'#b45309',fontWeight:600}}>{isAdmin?'Approve the loan to activate it':'Awaiting Admin approval'}</div>
                </div>
                <div className="mf"><button className="mb p" onClick={closeModal}>Done</button></div>
              </>}
            </>}

            {modal==='payemi'&&<>
              <div className="mtt">💳 Pay EMI Installment</div>
              <div className="note">Enter <strong>Loan ID</strong> + <strong>CR Number</strong>.<br/>Amount deducted from CR number's account automatically.</div>
              <label className="ml">Loan ID *</label><input className="mi" placeholder="e.g. LN10000001" type="text" value={form.emiLoanNo||''} onChange={e=>setForm({...form,emiLoanNo:e.target.value.toUpperCase()})}/>
              <label className="ml">CR Number *</label><input className="mi" placeholder="e.g. CR10000001" type="text" value={form.emiCrNo||''} onChange={e=>setForm({...form,emiCrNo:e.target.value.toUpperCase()})}/>
              <label className="ml">Payment Amount (LKR) *</label><input className="mi" placeholder="e.g. 5000" type="text" inputMode="decimal" value={form.emiAmount||''} onChange={e=>setForm({...form,emiAmount:e.target.value})}/>
              <label className="ml">Note (optional)</label><input className="mi" placeholder="e.g. November EMI" value={form.emiNote||''} onChange={e=>setForm({...form,emiNote:e.target.value})}/>
              {!payResult?<div className="mf"><button className="mb c" onClick={closeModal}>Cancel</button><button className="mb p" onClick={doPayEmi}>Pay Now</button></div>
              :<>
                <div className="pres" style={{marginBottom:12}}>
                  {[['Loan ID',payResult.loanNo],['Loan Type',payResult.loanType],['CR Number',payResult.customerNo],['Amount Paid',`LKR ${parseFloat(payResult.amountPaid||0).toLocaleString()}`],['New Balance',`LKR ${parseFloat(payResult.newBalance||0).toLocaleString()}`],['Total Paid',`LKR ${parseFloat(payResult.totalPaid||0).toLocaleString()}`],['Remaining',`LKR ${parseFloat(payResult.remaining||0).toLocaleString()}`],['Progress',`${payResult.loanProgress}%`]].map(([k,v],i)=>(
                    <div key={i} className="prr"><span>{k}</span><span style={k==='New Balance'?{color:'#dc2626'}:{}}>{v}</span></div>
                  ))}
                  {payResult.loanStatus==='Completed'&&<div className="prc">🎉 Loan Fully Repaid!</div>}
                </div>
                <div className="mf"><button className="mb c" onClick={()=>{setPayResult(null);setForm({});}}>Pay Another</button><button className="mb p" onClick={closeModal}>Done</button></div>
              </>}
            </>}

          </div>
        </div>
      )}

      {toast.msg&&<div className={`tst ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
