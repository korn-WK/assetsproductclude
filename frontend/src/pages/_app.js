import { AuthProvider } from '../contexts/AuthContext';
import { AssetProvider } from '../contexts/AssetContext';
import { DropdownProvider } from '../contexts/DropdownContext';
import '../../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AssetProvider>
        <DropdownProvider>
          <Component {...pageProps} />
        </DropdownProvider>
      </AssetProvider>
    </AuthProvider>
  );
}

export default MyApp;