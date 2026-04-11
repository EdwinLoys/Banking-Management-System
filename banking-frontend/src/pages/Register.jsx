import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleRegister = async () => {
        try {
            await axios.post('https://localhost:7001/api/auth/register', {
                fullName,
                email,
                password
            });
            setMessage('Registered successfully! Redirecting...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setMessage('Registration failed. Email may already exist.');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Banking App</h2>
                <h3 style={styles.subtitle}>Create Account</h3>

                {message && <p style={styles.message}>{message}</p>}

                <input
                    style={styles.input}
                    placeholder="Full Name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                />
                <input
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <input
                    style={styles.input}
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button style={styles.button} onClick={handleRegister}>
                    Register
                </button>
                <p style={styles.link}>
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '100vh', background: '#f0f2f5'
    },
    card: {
        background: 'white', padding: '40px', borderRadius: '12px',
        width: '360px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
    },
    title: { textAlign: 'center', color: '#1a73e8', marginBottom: '4px' },
    subtitle: { textAlign: 'center', color: '#555', marginBottom: '24px' },
    input: {
        width: '100%', padding: '12px', marginBottom: '16px',
        borderRadius: '8px', border: '1px solid #ddd',
        fontSize: '14px', boxSizing: 'border-box'
    },
    button: {
        width: '100%', padding: '12px', background: '#1a73e8',
        color: 'white', border: 'none', borderRadius: '8px',
        fontSize: '16px', cursor: 'pointer'
    },
    message: { color: 'green', marginBottom: '12px', textAlign: 'center' },
    link: { textAlign: 'center', marginTop: '16px', fontSize: '14px' }
};