import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://localhost:7001';

export default function Login() {
  const [role,     setRole]     = useState(null); // 'Admin' | 'Employee'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!role)          { setError('Please select your role first'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password)     { setError('Password is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/api/auth/login`, {
        email: email.trim().toLowerCase(), password
      });
      const { token, fullName, role: serverRole, userId } = res.data;

      // Role mismatch check
      if (role === 'Admin' && serverRole !== 'Admin') {
        setError('Access denied. This account does not have Admin privileges.'); setLoading(false); return;
      }
      if (role === 'Employee' && serverRole !== 'Employee') {
        setError('Access denied. This account is registered as Admin. Please select the Admin role.'); setLoading(false); return;
      }

      localStorage.setItem('token',    token);
      localStorage.setItem('fullName', fullName);
      localStorage.setItem('role',     serverRole);
      localStorage.setItem('userId',   String(userId));
      navigate('/dashboard');
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d : d?.message || 'Login failed. Check your credentials.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',sans-serif;background:#0f1b4c;min-height:100vh;}
        .wrap{display:flex;min-height:100vh;}

        /* ── Left Panel ── */
        .left{
          flex:1;position:relative;overflow:hidden;
          background:linear-gradient(160deg,#0a1232 0%,#1a3a6b 55%,#2c5aa0 100%);
          display:flex;flex-direction:column;justify-content:space-between;padding:44px 52px;
        }
        .left::before{
          content:'';position:absolute;inset:0;
          background:radial-gradient(ellipse at 30% 40%,rgba(44,90,160,0.35) 0%,transparent 65%),
                      radial-gradient(ellipse at 70% 80%,rgba(26,58,107,0.4) 0%,transparent 55%);
        }
        .left-z{position:relative;z-index:1;}
        /* logo */
        .logo{display:flex;align-items:center;gap:14px;}
        .logo-box{width:50px;height:50px;background:white;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 20px rgba(0,0,0,0.25);}
        .logo-name{font-size:22px;font-weight:800;color:white;letter-spacing:.4px;}
        .logo-tag{font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;}
        /* hero */
        .hero{text-align:center;padding:20px 0;}
        .hero-emoji{font-size:110px;display:block;margin-bottom:22px;filter:drop-shadow(0 6px 28px rgba(0,0,0,.35));}
        .hero-title{font-size:34px;font-weight:800;color:white;line-height:1.22;margin-bottom:14px;text-shadow:0 2px 14px rgba(0,0,0,.3);}
        .hero-sub{font-size:15px;color:rgba(255,255,255,.72);line-height:1.75;max-width:340px;margin:0 auto;}
        /* feature pills */
        .feats{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;}
        .feat{background:rgba(255,255,255,.1);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);
          border-radius:50px;padding:10px 18px;display:flex;align-items:center;gap:8px;
          font-size:12px;color:rgba(255,255,255,.85);font-weight:500;}
        .feat-icon{font-size:15px;}
        /* bottom badges */
        .left-foot{display:flex;gap:12px;flex-wrap:wrap;}
        .badge{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);
          border-radius:8px;padding:8px 14px;font-size:11px;color:rgba(255,255,255,.65);}

        /* ── Right Panel ── */
        .right{
          width:460px;flex-shrink:0;background:#f5f7fc;
          display:flex;flex-direction:column;justify-content:center;
          padding:52px 44px;overflow-y:auto;
        }
        .r-logo{display:flex;align-items:center;gap:10px;margin-bottom:30px;}
        .r-logo-box{width:38px;height:38px;background:#1a3a6b;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;}
        .r-logo-text{font-size:17px;font-weight:800;color:#1a3a6b;}
        .r-title{font-size:26px;font-weight:800;color:#1a3a6b;margin-bottom:5px;}
        .r-sub{font-size:13px;color:#64748b;margin-bottom:26px;}

        /* Role cards */
        .role-label{font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;display:block;}
        .role-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px;}
        .role-card{
          border:2px solid #e2e8f0;border-radius:14px;padding:16px 12px 13px;
          cursor:pointer;background:white;text-align:center;
          transition:all .2s;position:relative;
        }
        .role-card:hover{border-color:#2c5aa0;transform:translateY(-1px);box-shadow:0 4px 14px rgba(44,90,160,.12);}
        .role-card.sel-admin{border-color:#1a3a6b;background:#eef3fb;}
        .role-card.sel-emp{border-color:#15803d;background:#f0fdf4;}
        .role-icon{font-size:30px;margin-bottom:7px;display:block;}
        .role-name{font-size:14px;font-weight:700;color:#1a3a6b;margin-bottom:3px;}
        .role-desc{font-size:11px;color:#64748b;line-height:1.4;}
        .role-tick{
          position:absolute;top:9px;right:9px;width:20px;height:20px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-size:11px;color:white;
        }
        .tick-admin{background:#1a3a6b;}
        .tick-emp{background:#15803d;}

        /* Form */
        .fgrp{margin-bottom:15px;}
        .flbl{font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;display:block;}
        .finp{
          width:100%;padding:12px 14px;border:1.5px solid #dde3ec;border-radius:10px;
          font-size:14px;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;
          outline:none;transition:border-color .15s;
        }
        .finp:focus{border-color:#2c5aa0;box-shadow:0 0 0 3px rgba(44,90,160,.1);}
        .pass-wrap{position:relative;}
        .pass-wrap .finp{padding-right:44px;}
        .eye-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94a3b8;font-size:17px;padding:0;}

        /* Error box */
        .err-box{
          background:#fef2f2;border:1px solid #fecaca;border-radius:9px;
          padding:10px 13px;margin-bottom:13px;font-size:13px;color:#b91c1c;
          display:flex;align-items:flex-start;gap:8px;
        }

        /* Login button */
        .login-btn{
          width:100%;padding:13px;border:none;border-radius:10px;
          font-size:15px;font-weight:700;cursor:pointer;
          font-family:'Inter',sans-serif;margin-top:6px;
          display:flex;align-items:center;justify-content:center;gap:8px;
          transition:all .2s;
        }
        .btn-admin{background:linear-gradient(135deg,#1a3a6b,#2c5aa0);color:white;}
        .btn-emp{background:linear-gradient(135deg,#15803d,#16a34a);color:white;}
        .btn-idle{background:#e8edf5;color:#94a3b8;cursor:default;}
        .login-btn:not(.btn-idle):hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(0,0,0,.18);}
        .spin{width:17px;height:17px;border:2px solid rgba(255,255,255,.35);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}

        /* Divider */
        .div{display:flex;align-items:center;gap:10px;margin:18px 0;}
        .div-line{flex:1;height:1px;background:#e2e8f0;}
        .div-txt{font-size:11px;color:#94a3b8;white-space:nowrap;}

        /* Info box */
        .info-box{border-radius:11px;padding:13px 15px;}
        .info-admin{background:#eff4ff;border:1px solid #c7d7f8;}
        .info-emp{background:#f0fdf4;border:1px solid #bbf7d0;}
        .info-idle{background:#f8faff;border:1px solid #e2e8f0;}
        .info-title{font-size:12px;font-weight:700;margin-bottom:8px;}
        .info-title.admin{color:#1a3a6b;}
        .info-title.emp{color:#15803d;}
        .info-title.idle{color:#64748b;}
        .info-row{font-size:12px;color:#475569;margin-bottom:3px;}
        .info-row:last-child{margin-bottom:0;}

        /* Secure + footer */
        .secure{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;font-size:11px;color:#94a3b8;}
        .s-dot{width:6px;height:6px;border-radius:50%;background:#16a34a;}
        .footer{text-align:center;margin-top:18px;font-size:11px;color:#94a3b8;line-height:1.7;}
        .footer a{color:#2c5aa0;text-decoration:none;font-weight:500;}

        @media(max-width:860px){.left{display:none;}.right{width:100%;padding:36px 24px;}}
      `}</style>

      <div className="wrap">

        {/* ══ LEFT ══ */}
        <div className="left">
          <div className="left-z">
            <div className="logo">
              <div className="logo-box">🏛</div>
              <div>
                <div className="logo-name">Bank System</div>
                <div className="logo-tag">Trusted Banking Solutions</div>
              </div>
            </div>
          </div>

          <div className="left-z hero">
            <span className="hero-emoji">🏦</span>
            <div className="hero-title">
              Enjoy Banking<br/>Services with Ease
            </div>
            <div className="hero-sub">
              Secure, fast and reliable banking management.
              Manage customers, accounts, loans and transactions
              — all in one powerful dashboard.
            </div>
          </div>

          <div className="left-z">
            <div className="feats" style={{marginBottom:20}}>
              {[
                {icon:'🔒',t:'256-bit Encrypted'},
                {icon:'⚡',t:'Instant Transactions'},
                {icon:'📊',t:'Real-time Reports'},
                {icon:'🌐',t:'Azure & AWS Cloud'},
              ].map((f,i)=>(
                <div key={i} className="feat"><span className="feat-icon">{f.icon}</span>{f.t}</div>
              ))}
            </div>
            <div className="left-foot">
              <div className="badge">🏅 ISO 27001 Certified</div>
              <div className="badge">🛡 SOC 2 Compliant</div>
              <div className="badge">☁ Cloud Ready</div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className="right">
          <div className="r-logo">
            <div className="r-logo-box">🏛</div>
            <div className="r-logo-text">Bank System</div>
          </div>

          <div className="r-title">Welcome Back</div>
          <div className="r-sub">Sign in to your banking dashboard</div>

          {/* Role selection */}
          <span className="role-label">Select Your Role</span>
          <div className="role-grid">
            <div
              className={`role-card ${role==='Admin'?'sel-admin':''}`}
              onClick={()=>{setRole('Admin');setError('');}}
            >
              {role==='Admin'&&<div className="role-tick tick-admin">✓</div>}
              <span className="role-icon">👑</span>
              <div className="role-name">Admin</div>
              <div className="role-desc">Full system access & control</div>
            </div>
            <div
              className={`role-card ${role==='Employee'?'sel-emp':''}`}
              onClick={()=>{setRole('Employee');setError('');}}
            >
              {role==='Employee'&&<div className="role-tick tick-emp">✓</div>}
              <span className="role-icon">👤</span>
              <div className="role-name">Employee</div>
              <div className="role-desc">Standard banking operations</div>
            </div>
          </div>

          {/* Error */}
          {error&&(
            <div className="err-box">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="fgrp">
            <label className="flbl">Email Address</label>
            <input
              className="finp" type="email" placeholder="you@bank.com"
              value={email} onChange={e=>{setEmail(e.target.value);setError('');}}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
            />
          </div>

          {/* Password */}
          <div className="fgrp">
            <label className="flbl">Password</label>
            <div className="pass-wrap">
              <input
                className="finp" type={showPass?'text':'password'} placeholder="Enter your password"
                value={password} onChange={e=>{setPassword(e.target.value);setError('');}}
                onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              />
              <button className="eye-btn" onClick={()=>setShowPass(!showPass)}>
                {showPass?'🙈':'👁'}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            className={`login-btn ${!role?'btn-idle':role==='Admin'?'btn-admin':'btn-emp'}`}
            onClick={handleLogin}
            disabled={loading||!role}
          >
            {loading
              ?<><div className="spin"/>Signing in...</>
              :<>{role==='Admin'?'👑':role==='Employee'?'👤':'🔐'} {role?`Sign in as ${role}`:'Select a role to continue'}</>
            }
          </button>

          <div className="div">
            <div className="div-line"/><span className="div-txt">Access Information</span><div className="div-line"/>
          </div>

          {/* Info box */}
          <div className={`info-box ${!role?'info-idle':role==='Admin'?'info-admin':'info-emp'}`}>
            <div className={`info-title ${!role?'idle':role==='Admin'?'admin':'emp'}`}>
              {!role?'Role-Based Access Control':role==='Admin'?'👑 Admin Permissions':'👤 Employee Permissions'}
            </div>
            {!role&&<>
              <div className="info-row">👑 Admin — Full system control</div>
              <div className="info-row">👤 Employee — Standard operations</div>
            </>}
            {role==='Admin'&&<>
              <div className="info-row">✅ Approve / Reject loan applications</div>
              <div className="info-row">✅ Delete customers & accounts</div>
              <div className="info-row">✅ View audit logs & fraud alerts</div>
              <div className="info-row">✅ Export CSV reports</div>
              <div className="info-row">✅ Full system control</div>
            </>}
            {role==='Employee'&&<>
              <div className="info-row">✅ Add customers & create accounts</div>
              <div className="info-row">✅ Process transactions</div>
              <div className="info-row">✅ Apply for loans & pay EMI</div>
              <div className="info-row">✅ View reports & print PDFs</div>
              <div className="info-row">❌ Cannot approve loans or delete data</div>
            </>}
          </div>

          <div className="secure">
            <div className="s-dot"/>
            <span>256-bit SSL &nbsp;|&nbsp; Secure Session &nbsp;|&nbsp; JWT Protected</span>
          </div>
          <div className="footer">
            © {new Date().getFullYear()} Bank System — All rights reserved.<br/>
            Deploying on <a href="#">Azure</a> &amp; <a href="#">AWS</a> Cloud
          </div>
        </div>
      </div>
    </>
  );
}
