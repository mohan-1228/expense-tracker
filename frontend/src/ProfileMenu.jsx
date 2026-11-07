import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from './api';

export default function ProfileMenu({ onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const me = getCurrentUser();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goToTab(tab) {
    setOpen(false);
    navigate(`/account?tab=${tab}`);
  }

  const initial = me?.name?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full
                   bg-gradient-to-br from-violet-600 to-pink-500 text-lg
                   font-bold text-white shadow-sm hover:opacity-90"
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-slate-200
                     bg-white p-2 shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="truncate text-sm font-semibold text-slate-800">
              {me?.name || 'Account'}
            </p>
            <p className="truncate text-xs text-slate-500">{me?.email}</p>
          </div>

          <button
            type="button"
            onClick={() => goToTab('profile')}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm
                       text-slate-700 hover:bg-slate-50"
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => goToTab('password')}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm
                       text-slate-700 hover:bg-slate-50"
          >
            Change password
          </button>
          <button
            type="button"
            onClick={() => goToTab('categories')}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm
                       text-slate-700 hover:bg-slate-50"
          >
            Categories
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={onLogout}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm
                       font-medium text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
