import { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { notifications, markAsRead, markAllAsRead, refresh } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!open) refresh();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      
      // Check if the click is outside the dropdown
      const isOutside = !dropdownRef.current.contains(e.target as Node);
      if (isOutside) {
        setOpen(false);
      }
    };

    // Use mousedown to prevent focus issues, but ensure it only triggers when open
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative p-2.5 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-indigo-600 transition-all shadow-sm border border-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-red-500 text-xs text-white font-bold rounded-full border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                >
                  Marcar leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm font-medium">No hay notificaciones</p>
                <p className="text-gray-400 text-xs mt-1">Estás al día con todo</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <li key={notif.id} className={`transition-colors hover:bg-gray-50 ${!notif.read ? 'bg-indigo-50/30' : 'bg-white'}`}>
                    <Link
                      to={notif.link}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                        setOpen(false);
                      }}
                      className="flex items-start gap-3 p-4"
                    >
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.read ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-transparent'}`}></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {notif.description}
                        </p>
                        {notif.createdAt && (
                          <p className="text-[10px] text-gray-400 mt-2 font-medium">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
