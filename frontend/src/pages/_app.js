import { AuthProvider } from '../contexts/AuthContext';
import { AssetProvider } from '../contexts/AssetContext';
import { DropdownProvider } from '../contexts/DropdownContext';
import '../../styles/globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AssetProvider>
        <DropdownProvider>
          <Component {...pageProps} />
          <ToastContainer position="top-right" autoClose={8000} />
        </DropdownProvider>
      </AssetProvider>
    </AuthProvider>
  );
}

export default MyApp;