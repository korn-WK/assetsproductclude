// pages/login.tsx
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const router = useRouter();
  const { error } = router.query;
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect based on user role after authentication
    if (!loading && user) {
      if (user.role === 'admin' || user.email === 'admin@mfu.ac.th' || user.email?.includes('admin')) {
        router.push('/admin/dashboard');
      } else {
        router.push('/user/asset-browser');
      }
    }
  }, [user, loading, router]);

  // MFU SSO - For demonstration, this will also link to Google OAuth
  // In a real scenario, MFU SSO would have its own OAuth/SAML flow
  const handleMFUSSO = () => {
    // For now, link it to Google OAuth as an example.
    // In a real scenario, this would be a separate SSO integration.
    window.location.href = '/api/auth/google';
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>เข้าสู่ระบบ - ระบบตรวจสอบและตรวจนับครุภัณฑ์</title>
      </Head>

      {/* Header with MFU Logo and Text */}
      <div style={styles.header}>
        {/* Placeholder for MFU Logo - You should replace this with your actual image */}
        <img
          src="/mfu-logo.png" // Make sure to place your MFU logo image in the public folder
          alt="Mae Fah Luang University Logo"
          style={styles.logo}
        />
        <div style={styles.headerText}>
          <p style={styles.divisionText}>ส่วนพัสดุ มหาวิทยาลัยแม่ฟ้าหลวง</p>
          <p style={styles.divisionEnglish}>Division of Procurement and Supplies, Mae Fah Luang University</p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Left Side - Welcome Text */}
        <div style={styles.welcomeSection}>
          <h1 style={styles.helloText}>Hello,</h1>
          <h1 style={styles.welcomeText}>Welcome!</h1>
          <p style={styles.universityText}>Mae Fah Luang University</p>
        </div>

        {/* Right Side - Login Form Box */}
        <div style={styles.loginBox}>
          <h2 style={styles.loginTitle}>LOGIN</h2>

          {/* Error Message */}
          {error && (
            <p style={styles.errorMessage}>
              เกิดข้อผิดพลาดในการเข้าสู่ระบบ: {error === 'google_auth_failed' ? 'Google Authentication Failed.' : 'Unknown error.'}
            </p>
          )}

          {/* Username and Password fields (disabled for now as we focus on SSO) */}
          <input
            type="text"
            placeholder="Username"
            style={styles.inputField}
            disabled // Disabled for now, as per the design focus on SSO
          />
          <div style={styles.passwordContainer}>
            <input
              type="password"
              placeholder="Password"
              style={styles.inputField}
              disabled // Disabled for now
            />
            {/* You can add an eye icon here for show/hide password */}
            <span style={styles.eyeIcon}><img src="/eye-icon.png" alt="Toggle Password Visibility" style={{ width: '18px', height: '18px' }} /></span> {/* Placeholder for an eye icon image */}
          </div>
          <p style={styles.forgotPassword}>forgot the password?</p>

          {/* MFU SSO Button (linked to Google OAuth for now) */}
          <button
            onClick={handleMFUSSO}
            style={styles.ssoButton}
          >
            <img src="/mfu-sso-logo.png" alt="MFU SSO logo" style={styles.ssoLogo} /> {/* Placeholder for MFU SSO logo */}
            MFU SSO
          </button>

          {/* Hidden Google Login Button for testing if MFU SSO links to it */}
          {/* <button
            onClick={handleGoogleLogin}
            style={{ ...styles.ssoButton, backgroundColor: '#4285F4', marginTop: '10px' }}
          >
            เข้าสู่ระบบด้วย Google (ทดสอบ)
          </button> */}
        </div>
      </div>
    </div>
  );
};

// Basic Inline Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#fff', // White background for the whole page
    fontFamily: 'Arial, sans-serif', // You might want to use a specific font for MFU
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 50px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #eee',
  },
  logo: {
    width: '60px', // Adjust size as needed
    height: '60px', // Adjust size as needed
    marginRight: '15px',
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    color: '#333',
  },
  divisionText: {
    margin: 0,
    fontSize: '1.2em',
    fontWeight: 'bold',
  },
  divisionEnglish: {
    margin: 0,
    fontSize: '0.9em',
    color: '#666',
  },
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px',
    gap: '80px', // Space between welcome text and login box
    flexWrap: 'wrap', // Allows wrapping on smaller screens
  },
  welcomeSection: {
    textAlign: 'left',
    color: '#333',
    maxWidth: '400px',
  },
  helloText: {
    fontSize: '3.5em',
    fontWeight: 'normal',
    margin: '0',
    lineHeight: '1.1',
  },
  welcomeText: {
    fontSize: '3.5em',
    fontWeight: 'bold',
    margin: '0',
    lineHeight: '1.1',
  },
  universityText: {
    fontSize: '1.8em',
    margin: '15px 0 0 0',
    color: '#555',
  },
  loginBox: {
    backgroundColor: '#8B0000', // Dark red similar to the image
    padding: '50px 60px',
    borderRadius: '25px', // More rounded corners
    boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
    textAlign: 'center',
    maxWidth: '450px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  loginTitle: {
    color: 'white',
    fontSize: '2.5em',
    marginBottom: '20px',
    letterSpacing: '2px',
  },
  errorMessage: {
    color: '#ffdddd',
    backgroundColor: 'rgba(255,0,0,0.3)',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '15px',
    fontSize: '0.9em',
  },
  inputField: {
    width: 'calc(100% - 20px)', // Full width minus padding
    padding: '15px 10px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1.1em',
    backgroundColor: 'rgba(255,255,255,0.9)', // Slightly transparent white
    color: '#333',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: '40px',
    cursor: 'pointer',
    color: '#888',
  },
  forgotPassword: {
    color: '#FFD700', // Gold-like color for emphasis
    fontSize: '0.9em',
    textAlign: 'right',
    marginRight: '5px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  ssoButton: {
    padding: '15px 20px',
    fontSize: '1.2em',
    backgroundColor: 'white', // White button background
    color: '#8B0000', // Dark red text
    border: 'none',
    borderRadius: '10px', // Rounded corners
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 5px 10px rgba(0,0,0,0.3)',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    fontWeight: 'bold',
    marginTop: '30px',
  },
  ssoLogo: {
    width: '25px', // Adjust size as needed
    height: '25px', // Adjust size as needed
  },
};

export default LoginPage;