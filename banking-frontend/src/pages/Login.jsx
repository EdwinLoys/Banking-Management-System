import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://localhost:7001';

export default function Login() {
  const [role,     setRole]     = useState(null);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const selectRole = (r) => {
    setRole(r);
    setError('');
    // ✅ Clear email and password when switching role
    setEmail('');
    setPassword('');
    setShowPass(false);
  };

  const handleLogin = async () => {
    if (!role)         { setError('Please select your role first'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password)     { setError('Password is required'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API}/api/auth/login`, {
        email:    email.trim().toLowerCase(),
        password: password,
      });

      const { token, fullName, role: serverRole, userId } = res.data;

      // ✅ Role check — compare selected role vs actual role from server
      if (role === 'Admin' && serverRole !== 'Admin') {
        setError(
          `Access denied. "${email}" is registered as ${serverRole}. ` +
          `Please select the ${serverRole} role instead.`
        );
        setLoading(false);
        return;
      }
      if (role === 'Employee' && serverRole !== 'Employee') {
        setError(
          `Access denied. "${email}" is registered as ${serverRole}. ` +
          `Please select the ${serverRole} role instead.`
        );
        setLoading(false);
        return;
      }

      localStorage.setItem('token',    token);
      localStorage.setItem('fullName', fullName);
      localStorage.setItem('role',     serverRole);
      localStorage.setItem('userId',   String(userId));

      navigate('/dashboard');
    } catch (err) {
      const d = err.response?.data;
      const msg =
        typeof d === 'string'  ? d :
        d?.message             ? d.message :
        err.response?.status === 401 ? 'Wrong email or password. Please check and try again.' :
        'Cannot connect to server. Make sure the API is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',sans-serif;background:#0f1b4c;min-height:100vh;}
        .wrap{display:flex;min-height:100vh;}

        /* ── Left panel ── */
        .left{
          flex:1;position:relative;overflow:hidden;
          background:linear-gradient(160deg,#0a1232 0%,#1a3a6b 55%,#2c5aa0 100%);
          display:flex;flex-direction:column;justify-content:space-between;padding:44px 52px;
        }
        .left::before{
          content:'';position:absolute;inset:0;
          background:
            radial-gradient(ellipse at 30% 40%,rgba(44,90,160,0.3) 0%,transparent 60%),
            radial-gradient(ellipse at 70% 80%,rgba(26,58,107,0.35) 0%,transparent 55%);
          pointer-events:none;
        }
        .lz{position:relative;z-index:1;}

        /* Logo */
        .logo{display:flex;align-items:center;gap:14px;}
        .logo-box{width:50px;height:50px;background:white;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 20px rgba(0,0,0,.25);}
        .logo-name{font-size:22px;font-weight:800;color:white;letter-spacing:.4px;}
        .logo-tag{font-size:12px;color:rgba(255,255,255,.5);margin-top:2px;}

        /* Hero */
        .hero{text-align:center;padding:10px 0;}
        .hero-em{font-size:108px;display:block;margin-bottom:22px;filter:drop-shadow(0 6px 28px rgba(0,0,0,.35));}
        .hero-title{font-size:34px;font-weight:800;color:white;line-height:1.22;margin-bottom:14px;text-shadow:0 2px 14px rgba(0,0,0,.3);}
        .hero-sub{font-size:15px;color:rgba(255,255,255,.7);line-height:1.75;max-width:340px;margin:0 auto;}

        /* Feature pills */
        .feats{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:20px;}
        .feat{background:rgba(255,255,255,.1);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);
          border-radius:50px;padding:10px 18px;display:flex;align-items:center;gap:8px;
          font-size:12px;color:rgba(255,255,255,.85);font-weight:500;}

        /* Bottom badges */
        .left-foot{display:flex;gap:10px;flex-wrap:wrap;}
        .badge{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);
          border-radius:8px;padding:8px 14px;font-size:11px;color:rgba(255,255,255,.6);}

        /* ── Right panel ── */
        .right{
          width:460px;flex-shrink:0;background:#f5f7fc;
          display:flex;flex-direction:column;justify-content:center;
          padding:52px 44px;overflow-y:auto;
        }
        .r-logo{display:flex;align-items:center;gap:10px;margin-bottom:28px;}
        .r-logo-box{width:38px;height:38px;background:#1a3a6b;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;}
        .r-logo-text{font-size:17px;font-weight:800;color:#1a3a6b;}
        .r-title{font-size:26px;font-weight:800;color:#1a3a6b;margin-bottom:5px;}
        .r-sub{font-size:13px;color:#64748b;margin-bottom:24px;}

        /* Role cards */
        .rl-label{font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.07em;margin-bottom:9px;display:block;}
        .rl-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
        .rl-card{
          border:2px solid #e2e8f0;border-radius:14px;padding:16px 12px 13px;
          cursor:pointer;background:white;text-align:center;
          transition:all .2s;position:relative;
        }
        .rl-card:hover{border-color:#2c5aa0;transform:translateY(-1px);box-shadow:0 4px 14px rgba(44,90,160,.12);}
        .rl-card.sel-admin{border-color:#1a3a6b;background:#eef3fb;transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,58,107,.15);}
        .rl-card.sel-emp{border-color:#15803d;background:#f0fdf4;transform:translateY(-1px);box-shadow:0 4px 14px rgba(21,128,61,.15);}
        .rl-icon{font-size:30px;margin-bottom:7px;display:block;}
        .rl-name{font-size:14px;font-weight:700;color:#1a3a6b;margin-bottom:3px;}
        .rl-desc{font-size:11px;color:#64748b;line-height:1.4;}
        .rl-tick{
          position:absolute;top:9px;right:9px;width:20px;height:20px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:700;
        }
        .tick-a{background:#1a3a6b;}
        .tick-e{background:#15803d;}

        /* Form */
        .fgrp{margin-bottom:14px;}
        .flbl{font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;display:block;}
        .finp{
          width:100%;padding:12px 14px;border:1.5px solid #dde3ec;border-radius:10px;
          font-size:14px;color:#1a3a6b;background:white;font-family:'Inter',sans-serif;
          outline:none;transition:border-color .15s;
        }
        .finp:focus{border-color:#2c5aa0;box-shadow:0 0 0 3px rgba(44,90,160,.1);}
        .pw{position:relative;}
        .pw .finp{padding-right:44px;}
        .eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;padding:0;line-height:1;}

        /* Error */
        .err{background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:10px 13px;margin-bottom:13px;font-size:13px;color:#b91c1c;display:flex;align-items:flex-start;gap:8px;line-height:1.5;}

        /* Login btn */
        .lbtn{
          width:100%;padding:13px;border:none;border-radius:10px;
          font-size:15px;font-weight:700;cursor:pointer;
          font-family:'Inter',sans-serif;margin-top:6px;
          display:flex;align-items:center;justify-content:center;gap:8px;
          transition:all .2s;
        }
        .btn-a{background:linear-gradient(135deg,#1a3a6b,#2c5aa0);color:white;}
        .btn-e{background:linear-gradient(135deg,#15803d,#16a34a);color:white;}
        .btn-idle{background:#e8edf5;color:#94a3b8;cursor:default;}
        .lbtn:not(.btn-idle):hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(0,0,0,.18);}
        .lbtn:disabled{opacity:.8;}
        .spin{width:17px;height:17px;border:2px solid rgba(255,255,255,.35);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}

        /* Info box */
        .info{border-radius:11px;padding:13px 15px;margin-top:16px;}
        .info-a{background:#eff4ff;border:1px solid #c7d7f8;}
        .info-e{background:#f0fdf4;border:1px solid #bbf7d0;}
        .info-idle{background:#f8faff;border:1px solid #e2e8f0;}
        .info-title{font-size:12px;font-weight:700;margin-bottom:7px;}
        .info-title.a{color:#1a3a6b;}.info-title.e{color:#15803d;}.info-title.idle{color:#64748b;}
        .info-row{font-size:12px;color:#475569;margin-bottom:3px;}
        .info-row:last-child{margin-bottom:0;}

        @media(max-width:860px){.left{display:none;}.right{width:100%;padding:36px 24px;}}
      `}</style>

      <div className="wrap">

        {/* ── LEFT ── */}
        <div className="left">
          <div className="lz">
            <div className="logo">
              <div className="logo-box">🏛</div>
              <div>
                <div className="logo-name">Bank System</div>
                <div className="logo-tag">Trusted Banking Solutions</div>
              </div>
            </div>
          </div>

          <div className="lz hero">
            <span className="hero-em">🏦</span>
            <div className="hero-title">
              Enjoy Banking<br/>Services with Ease
            </div>
            <div className="hero-sub">
              Secure, fast and reliable banking management.
              Manage customers, accounts, loans and transactions
              — all in one powerful dashboard.
            </div>
          </div>

          <div className="lz">
            <div className="feats">
              {[
                /*{icon:'🔒',t:'256-bit Encrypted'},*/
                //{icon:'⚡',t:'Instant Transactions'},
                //{icon:'📊',t:'Real-time Reports'},
                //{icon:'🌐',t:'Azure & AWS Cloud'},
              ].map((f,i)=>(
                <div key={i} className="feat"><span>{f.icon}</span>{f.t}</div>
              ))}
            </div>
            <div className="left-foot">
              {/*<div className="badge">🏅 ISO 27001 Certified</div>*/}
              {/*<div className="badge">🛡 SOC 2 Compliant</div>*/}
              {/*<div className="badge">☁ Cloud Ready</div>*/}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="right">
          <div className="r-logo">
            <div className="r-logo-box">🏛</div>
            <div className="r-logo-text">Bank System</div>
          </div>

          <div className="r-title">Welcome Back</div>
          <div className="r-sub">Sign in to your banking dashboard</div>

          {/* Role selection — clears form on switch */}
          <span className="rl-label">Select Your Role</span>
          <div className="rl-grid">
            <div
              className={`rl-card ${role==='Admin'?'sel-admin':''}`}
              onClick={()=>selectRole('Admin')}
            >
              {role==='Admin'&&<div className="rl-tick tick-a">✓</div>}
              <span className="rl-icon">👑</span>
              <div className="rl-name">Admin</div>
              <div className="rl-desc">Full system access & control</div>
            </div>
            <div
              className={`rl-card ${role==='Employee'?'sel-emp':''}`}
              onClick={()=>selectRole('Employee')}
            >
              {role==='Employee'&&<div className="rl-tick tick-e">✓</div>}
              <span className="rl-icon">👤</span>
              <div className="rl-name">Employee</div>
              <div className="rl-desc">Standard banking operations</div>
            </div>
          </div>

          {/* Error message */}
          {error&&(
            <div className="err">
              <span style={{flexShrink:0}}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="fgrp">
            <label className="flbl">Email Address</label>
            <input
              className="finp"
              type="email"
              placeholder="you@bank.com"
              value={email}
              onChange={e=>{setEmail(e.target.value);setError('');}}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="fgrp">
            <label className="flbl">Password</label>
            <div className="pw">
              <input
                className="finp"
                type={showPass?'text':'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e=>{setPassword(e.target.value);setError('');}}
                onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                autoComplete="current-password"
              />
              <button className="eye" onClick={()=>setShowPass(!showPass)} type="button">
                {showPass?'🙈':'👁'}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            className={`lbtn ${!role?'btn-idle':role==='Admin'?'btn-a':'btn-e'}`}
            onClick={handleLogin}
            disabled={loading||!role}
            type="button"
          >
            {loading
              ? <><div className="spin"/>Signing in...</>
              : <>{role==='Admin'?'👑':role==='Employee'?'👤':'🔐'} {role?`Sign in as ${role}`:'Select a role to continue'}</>
            }
          </button>

          {/* Info box — role permissions */}
          <div className={`info ${!role?'info-idle':role==='Admin'?'info-a':'info-e'}`}>
            <div className={`info-title ${!role?'idle':role==='Admin'?'a':'e'}`}>
              {!role?'Role-Based Access Control':role==='Admin'?'👑 Admin Permissions':'👤 Employee Permissions'}
            </div>
            {!role&&<>
              <div className="info-row">👑 Admin — Full system control & approvals</div>
              <div className="info-row">👤 Employee — Standard banking operations</div>
            </>}
            {role==='Admin'&&<>
              <div className="info-row">✅ Approve & reject loan applications</div>
              <div className="info-row">✅ Delete customers & data</div>
              <div className="info-row">✅ View audit logs & fraud alerts</div>
              <div className="info-row">✅ Export CSV reports</div>
            </>}
            {role==='Employee'&&<>
              <div className="info-row">✅ Add customers & create accounts</div>
              <div className="info-row">✅ Process deposits & withdrawals</div>
              <div className="info-row">✅ Apply for loans & pay EMI</div>
              <div className="info-row">❌ Cannot approve loans or delete data</div>
            </>}
          </div>
          {/* ✅ Footer removed as requested */}
        </div>
      </div>
    </>
  );
}
