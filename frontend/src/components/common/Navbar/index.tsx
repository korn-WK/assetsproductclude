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
  onSearch?: (keyword: string) => void; // เพิ่ม prop onSearch
}

const Navbar: React.FC<NavbarProps> = ({ title, isAdmin = false, onMenuClick, scanBarcodeIcon = false, onScanBarcodeClick, onSearch }) => {
  const { user, loading, logout } = useAuth();
  const { searchAssets, fetchAssets, assets } = useAssets(); // เพิ่ม assets
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]); // สำหรับ suggestion dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery);
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      // focus suggestion list
      const firstItem = suggestionsRef.current?.querySelector('div');
      if (firstItem) (firstItem as HTMLElement).focus();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch('');
    }
  };

  // Suggestion filter logic
  useEffect(() => {
    if (searchQuery.trim() && assets && assets.length > 0) {
      const lower = searchQuery.toLowerCase();
      const filtered = assets.filter(
        (a) =>
          a.asset_code?.toLowerCase().includes(lower) ||
          a.name?.toLowerCase().includes(lower)
      ).slice(0, 8); // limit suggestion
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, assets]);

  // Click outside to close suggestion
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).classList.contains(styles.searchInput)
      ) {
        setShowSuggestions(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



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
        <div className={styles.searchContainer} style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search in table..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (onSearch) {
                onSearch(e.target.value); // เรียกทุกครั้งที่พิมพ์
              }
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
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
          {/* Suggestion Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className={styles.suggestionDropdown}
              ref={suggestionsRef}
              tabIndex={-1}
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                right: 0,
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                zIndex: 100,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {suggestions.map((item, idx) => (
                <div
                  key={item.id}
                  tabIndex={0}
                  className={styles.suggestionItem}
                  style={{
                    padding: '0.7rem 1rem',
                    cursor: 'pointer',
                    borderBottom: idx !== suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}
                  onClick={() => {
                    setSearchQuery(`${item.asset_code} - ${item.name}`);
                    setShowSuggestions(false);
                    if (onSearch) onSearch(`${item.asset_code} - ${item.name}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery(`${item.asset_code} - ${item.name}`);
                      setShowSuggestions(false);
                      if (onSearch) onSearch(`${item.asset_code} - ${item.name}`);
                    }
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.asset_code}</span> - <span>{item.name}</span>
                </div>
              ))}
            </div>
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
                {user.originalRole?.toLowerCase() === 'superadmin' && (
                  <div className={styles.adminBadge}>SuperAdmin</div>
                )}
                {user.originalRole?.toLowerCase() === 'admin' && (
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