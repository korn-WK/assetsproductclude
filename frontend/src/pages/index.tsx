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
      const role = user.originalRole?.toLowerCase();
      if (role === 'superadmin') {
        router.push('/admin/asset-management');
      } else if (role === 'user' || role === 'admin') {
        router.push('/user/asset-browser');
      }
    }
  }, [user, loading, router]);

  const handleMFUSSO = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <>
      <style>{`       
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: none; }
        }
        /* --- Header Responsive --- */
        @media (max-width: 768px) {
          .headerLogo { height: 38px !important; }
          .headerTH { font-size: 18px !important; }
          .headerEN { font-size: 12px !important; }
        }
        /* --- Mobile Styles --- */
        @media (max-width: 768px) {
          .wrapper {
            flex-direction: column;
            min-height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .left {
            min-width: unset;
            padding: 25px 15px 15px 15px;
            flex: none;
            height: auto;
            min-height: 100vh;
            justify-content: center;
          }
          .menuBox {
            padding: 20px 18px 18px 18px;
            gap: 10px;
            max-width: 340px;
          }
          .logoBox {
            margin-bottom: 5px;
          }
          .logo {
            width: 60px;
            height: 60px;
          }
          .title {
            font-size: clamp(1em, 6vw, 1.3em) !important;
            max-width: 95vw !important;
          }
          .subtitle {
            font-size: 0.85em;
            margin: 5px 0 15px 0;
          }
          .menuGrid {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 18px;
            width: 100%;
            max-width: 100%;
          }
          .menuCard {
            padding: 8px 5px;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 3px;
          }
          .menuIcon {
            width: 20px;
            height: 20px;
          }
          .menuTitle {
            font-size: 0.8em;
            margin-bottom: 0;
            line-height: 1.1;
          }
          .menuDesc {
            font-size: 0.7em;
            line-height: 1.1;
          }
          .ssoButton {
            font-size: 0.9em;
            padding: 10px 0;
            margin-top: 15px;
            max-width: 280px;
          }
          .ssoLogo {
            width: 20px;
            height: 20px;
          }
          .errorMessage {
            font-size: 0.85em;
            padding: 6px;
            margin: 8px 0;
          }
          .right {
            display: none;
          }
        }

        /* Adjustments for smaller desktop/tablet */
        @media (max-width: 1024px) and (min-width: 769px) {
          .left {
            max-width: 450px;
          }
          .menuBox {
            padding: 35px 30px 30px 30px;
          }
          .menuGrid {
            gap: 14px;
            max-width: 380px;
          }
        }

        @media (max-width: 600px) {
          .wrapper {
            flex-direction: column;
            min-height: 100vh;
            align-items: center;
            background: linear-gradient(180deg, #f8fbff 60%, #eaf3fa 100%);
          }
          .left {
            min-width: unset;
            padding: 18px 4vw 8px 4vw;
            flex: none;
            height: auto;
            min-height: 100vh;
            justify-content: flex-start;
            align-items: center;
            background: transparent;
          }
          .logoBox {
            margin-bottom: 8px;
          }
          .logo {
            width: 90px;
            height: 95px;
          }
          .title {
            font-size: 1.3em;
            margin: 10px 0 0 0;
            text-align: center;
            max-width: 95vw;
          }
          .subtitle {
            font-size: 0.95em;
            margin: 6px 0 18px 0;
            text-align: center;
          }
          .menuBox {
            padding: 0;
            gap: 10px;
            max-width: 98vw;
            background: transparent;
            box-shadow: none;
          }
          .menuGrid {
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            width: 100%;
            max-width: 98vw;
            margin: 0 auto;
          }
          .menuCard {
            width: 100%;
            max-width: 100%;
            min-height: 80px;
            padding: 16px 10px;
            border-radius: 16px;
            box-shadow: 0 2px 12px 0 rgba(60,60,130,0.07);
            margin: 0 auto;
          }
          .menuIcon {
            width: 32px;
            height: 32px;
            margin-bottom: 6px;
          }
          .menuTitle {
            font-size: 0.97em;
            text-align: center;
          }
          .menuDesc {
            font-size: 0.82em;
            text-align: center;
          }
          .ssoButton {
            width: 100%;
            max-width: 100%;
            margin-top: 28px;
            font-size: 1em;
            border-radius: 14px;
            padding: 14px 0;
          }
        }
      `}</style>
      <div className="wrapper" style={styles.wrapper}>
        <Head>
          <title>Sign In - MFU ASSET AUDIT & INVENTORY SYSTEM</title>
        </Head>
        {/* Left Side (Login/Menu) */}
        <div className="left" style={styles.left}>
          <div className="menuBox" style={{ ...styles.menuBox, animation: 'fadeInUp 0.8s cubic-bezier(.39,.575,.565,1) both' }}>
            <div className="logoBox" style={{ ...styles.logoBox, animation: 'fadeInUp 1.2s cubic-bezier(.39,.575,.565,1) both', boxShadow: 'none', filter: 'none' }}>
              <img src="mfu-logo.png" alt="MFU Logo" className="logo" style={{ ...styles.logo, boxShadow: 'none', filter: 'none' }} />
            </div>
            <h1 className="title" style={styles.title}>MFU ASSET AUDIT & INVENTORY SYSTEM</h1>
            <p className="subtitle" style={styles.subtitle}>Division of Procurement and Supplies<br />Mae Fah Luang University</p>
            <div className="menuGrid" style={styles.menuGrid}>
              <div className="menuCard" style={styles.menuCard}>
                <img src="/content-management.png" alt="Asset Management" className="menuIcon" style={styles.menuIcon} />
                <div>
                  <div className="menuTitle" style={styles.menuTitle}>Asset Management</div>
                  <div className="menuDesc" style={styles.menuDesc}>Add, search, and edit assets</div>
                </div>
              </div>
              <div className="menuCard" style={styles.menuCard}>
                <img src="/location.png" alt="Location Info" className="menuIcon" style={styles.menuIcon} />
                <div>
                  <div className="menuTitle" style={styles.menuTitle}>Location Info</div>
                  <div className="menuDesc" style={styles.menuDesc}>Manage storage locations</div>
                </div>
              </div>
              <div className="menuCard" style={styles.menuCard}>
                <img src="/department.png" alt="Departments" className="menuIcon" style={styles.menuIcon} />
                <div>
                  <div className="menuTitle" style={styles.menuTitle}>Departments</div>
                  <div className="menuDesc" style={styles.menuDesc}>Department management</div>
                </div>
              </div>
              <div className="menuCard" style={styles.menuCard}>
                <img src="/report.png" alt="Reports" className="menuIcon" style={styles.menuIcon} />
                <div>
                  <div className="menuTitle" style={styles.menuTitle}>Reports</div>
                  <div className="menuDesc" style={styles.menuDesc}>Summary & download reports</div>
                </div>
              </div>
            </div>
            <button onClick={handleMFUSSO} className="ssoButton" style={styles.ssoButton}>
              <img src="/key.png" alt="MFU SSO logo" className="ssoLogo" style={styles.ssoLogo} />
              Sign in with MFU SSO
            </button>
            {error && (
              <p className="errorMessage" style={styles.errorMessage}>
                Sign in error: {error === 'google_auth_failed' ? 'Google Authentication Failed.' : 'Unknown error.'}
              </p>
            )}
          </div>
        </div>
        {/* Right Side (Header/Background) */}
        <div className="right" style={{...styles.right, position: 'relative'}}>
          {/* Header MFU Overlay - move to bottom left */}
          <div style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            zIndex: 11,
            margin: 0,
            padding: '32px 32px 28px 40px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 24,
          }}>
            <div className="header" style={{...styles.header, position: 'static', margin: 0, padding: 0}}>
              {/* โลโก้ MFU */}
              <img src="mfu-logo.png" alt="logo" className="headerLogo" style={{...styles.headerLogo, marginTop: 4}} />
              {/* เส้นแนวตั้ง */}
              <div style={{width: 6, height: 80, background: 'linear-gradient(180deg, #D7263D 0%, #E2AE37 100%)', borderRadius: 3, margin: '0 18px 0 8px'}} />
              {/* ข้อความ */}
              <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <span style={{fontSize: 28, color: '#FFFFFF', fontWeight: 550, letterSpacing: 1, lineHeight: 1.1, fontFamily: 'inherit'}}>ส่วนพัสดุ มหาวิทยาลัยแม่ฟ้าหลวง</span>
                <span style={{fontSize: 18, color: '#ffffff', fontWeight: 550, marginTop: 8, letterSpacing: 0.5, fontFamily: 'inherit'}}>Division of Procurement and Supplies, Mae Fah Luang University</span>
              </div>
            </div>
          </div>
          <div style={styles.bgOverlay}></div>
          <img src="maefahluang.jpg" alt="MFU Campus" style={{ ...styles.bgImg, animation: 'bgZoom 16s ease-in-out infinite alternate' }} />
        </div>
      </div>
    </>
  );
};

// Basic Inline Styles (ไม่มีการเปลี่ยนแปลงในส่วนนี้ เพราะการ responsive จัดการผ่าน Media Queries)
const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'stretch',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    background: '#ffffff',
  },
  left: {
    flex: 1,
    minWidth: 400,
    maxWidth: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 30px 20px 30px',
    background: '#ffffff',
    zIndex: 2,
  },
  menuBox: {
    width: '100%',
    maxWidth: 600,
    background: '#ffffff',
    boxShadow: 'none', 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
  },
  logoBox: {
    marginBottom: 10,
  },
  logo: {
    width: 100,
    height: 100
  },
  title: {
    fontSize: '1.7em',
    fontWeight: 600,
    margin: '10px 0 0 0',
    letterSpacing: 1,
    textAlign: 'center',
    color: '#000000',
    textShadow: '0 2px 8px rgba(28,169,229,0.08)',
  },
  subtitle: {
    color: 'rgba(151, 150, 150, 0.85)',
    fontSize: '1.1em',
    margin: '8px 0 22px 0',
    textAlign: 'center',
    lineHeight: 1.4,
    fontWeight: 500,
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 18,
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
  },
  menuCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 12px 0 rgba(60,60,130,0.07)',
    padding: '22px 24px 18px 24px',
    minWidth: 0,
    border: '1.5px solid #f2f4f8',
    transition: 'box-shadow 0.18s, transform 0.18s',
    cursor: 'default',
    width: '100%',
    maxWidth: '100%',
    minHeight: 90,
  },
  menuIcon: {
    width: 44,
    height: 44,
    objectFit: 'contain',
    marginBottom: 8,
    filter: 'drop-shadow(0 1px 2px rgba(28,169,229,0.10))',
    flexShrink: 0,
  },
  menuTitle: {
    fontWeight: 700,
    fontSize: '0.95em',
    color: '#222',
    marginBottom: 2,
    textAlign: 'center',
  },
  menuDesc: {
    fontSize: '0.85em',
    color: '#888',
    textAlign: 'center',
    marginTop: 0,
  },
  ssoButton: {
    width: '100%',
    maxWidth: 400,
    padding: '16px 0',
    fontSize: '1.13em',
    background: 'linear-gradient(90deg,rgb(114, 86, 241) 0%,rgb(151, 133, 252) 80%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontWeight: 700,
    margin: '18px 0 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    boxShadow: '0 4px 16px rgba(28,169,229,0.13)',
    transition: 'background 0.2s, transform 0.15s',
    letterSpacing: 0.5,
  },
  ssoLogo: {
    width: 28,
    height: 28,
  },
  errorMessage: {
    color: '#fff',
    background: '#D7263D',
    padding: '10px',
    borderRadius: 6,
    margin: '10px 0',
    fontSize: '0.97em',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(215,38,61,0.10)',
  },
  right: {
    flex: 1,
    minWidth: 400,
    maxWidth: 'none',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.85)',
  },
  bgImg: {
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    objectFit: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    filter: 'brightness(0.92) saturate(1.08)',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 30, 60, 0.16)',
    zIndex: 2,
  },
  header: {
    top: 24,
    left: 24,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'rgba(0,0,0,0)',
    padding: 0,
  },
  headerLogo: {
    height: 64,
    width: 'auto',
    minWidth: 40,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    lineHeight: 1.1,
  },
  headerTH: {
    fontSize: 28,
    color: '#E2AE37',
    textShadow: '2px 2px 3px #000, 0 0 1px #fff, 0 0 1px #fff',
    fontWeight: 700,
    letterSpacing: 1,
  },
  headerEN: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 400,
    letterSpacing: 2,
    textShadow: '2px 2px 3px #000, 0 0 1px #fff, 0 0 1px #fff',
  },
};

export default LoginPage;