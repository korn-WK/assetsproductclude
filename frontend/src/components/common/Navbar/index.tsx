import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AiOutlineMenu, AiOutlineSearch, AiOutlineUser, AiOutlineClose, AiOutlineCamera } from 'react-icons/ai';
import styles from './Navbar.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { useAssets } from '../../../contexts/AssetContext';
import Link from 'next/link';

interface NavbarProps {
  title?: string;
  isAdmin?: boolean;
  onMenuClick?: () => void;
  scanBarcodeIcon?: boolean;
  onScanBarcodeClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ title, isAdmin = false, onMenuClick, scanBarcodeIcon = false, onScanBarcodeClick }) => {
  const { user, loading, logout } = useAuth();
  const { searchAssets, fetchAssets } = useAssets();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const handleSearch = () => {
    console.log('Search triggered with query:', searchQuery);
    if (searchQuery.trim()) {
      console.log('Calling searchAssets with:', searchQuery);
      searchAssets(searchQuery);
    } else {
      console.log('Calling fetchAssets (empty search)');
      fetchAssets(); // If search is empty, fetch all assets
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Enter key pressed');
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    console.log('Clearing search');
    setSearchQuery('');
    fetchAssets();
  };

  console.log('User data in Navbar:', user);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = () => {
    if (typeof onMenuClick === 'function') {
      onMenuClick();
    }
  };

  return (
    <header className={styles.navbar}>
      <button className={styles.menuToggle} onClick={handleNavClick}>
        <AiOutlineMenu />
      </button>
      <div className={styles.assetsTitle}>
        {isMobile ? (
          <h1 className={styles.mobileTitle}>{title}</h1>
        ) : (
          <>
            <Image src="/icontitle.png" alt="Assets Logo" width={40} height={40} />
            <h1>{title}</h1>
          </>
        )}
      </div>
      {!isMobile && (
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by code, name, department..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className={styles.searchButton}
            onClick={handleSearch}
            title="Search"
          >
            <AiOutlineSearch className={styles.searchIcon} />
          </button>
          {searchQuery && (
            <button 
              className={styles.clearButton}
              onClick={handleClearSearch}
              title="Clear search"
            >
              ×
            </button>
          )}
          {scanBarcodeIcon && (
            <button
              className={styles.scanBarcodeButton}
              onClick={onScanBarcodeClick}
              title="สแกนบาร์โค้ด"
              type="button"
            >
              <AiOutlineCamera className={styles.scanBarcodeIcon} />
            </button>
          )}
        </div>
      )}
      <div className={styles.userProfile} ref={dropdownRef}>
        {loading ? (
          <p>Loading...</p>
        ) : user ? (
          <button className={styles.profileButton} onClick={() => setDropdownOpen(!isDropdownOpen)}>
            {user.picture ? (
              <Image src={user.picture} alt={user.name} width={isMobile ? 28 : 40} height={isMobile ? 28 : 40} className={isMobile ? styles.userAvatarMobile : styles.userAvatar} />
            ) : (
              <AiOutlineUser className={styles.userIcon} />
            )}
            {!isMobile && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                {user.role?.toLowerCase() === 'superadmin' && (
                  <div className={styles.adminBadge}>SuperAdmin</div>
                )}
                {user.role?.toLowerCase() === 'admin' && (
                  <div className={`${styles.adminBadge} ${styles.admin}`}>Admin</div>
                )}
              </div>
            )}
          </button>
        ) : (
          <AiOutlineUser className={styles.userIcon} />
        )}
        {isDropdownOpen && user && (
          <div className={styles.profileDropdown}>
            <div className={styles.dropdownHeader}>
              Signed in as <br />
              <strong>{user.name}</strong>
            </div>
            <ul className={styles.dropdownMenu}>
              <li className={styles.dropdownItem} onClick={logout}>
                Logout
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;