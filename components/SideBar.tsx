"use client";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Map,
  Car,
  Calendar,
  History,
  ShieldCheck,
  LogOut,
  Moon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Map", icon: Map, href: "/" },
  { label: "Vehicles", icon: Car, href: "/vehicles" },
  { label: "Bookings", icon: Calendar, href: "/bookings" },
  { label: "History", icon: History, href: "/historique" },
];

const accountItems = [];

const SidebarSkeleton = () => (
  <div className="flex items-center gap-3 px-3 mb-3 animate-pulse">
    <div className="w-10 h-10 rounded-full bg-gray-200" />
    <div className="flex flex-col gap-1.5">
      <div className="w-24 h-3.5 bg-gray-200 rounded-full" />
      <div className="w-16 h-3 bg-gray-100 rounded-full" />
    </div>
  </div>
);

const SideBar = () => {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col w-60 h-screen bg-white border-r border-gray-100 px-3 py-5">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-9 h-9 bg-cyan-500 rounded-xl flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <span className="text-cyan-500 font-bold text-xl">VoltCharge</span>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                ${
                  isActive
                    ? "bg-cyan-50 text-cyan-500"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
            >
              <Icon size={18} />
              <span className={isActive ? "font-medium" : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Account Section */}
      <div className="mt-8">
        <p className="text-gray-400 text-xs font-semibold tracking-widest px-3 mb-2">
          ACCOUNT
        </p>
        <div className="flex flex-col gap-1">
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                ${
                  pathname.startsWith("/admin")
                    ? "bg-cyan-50 text-cyan-500"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
            >
              <ShieldCheck size={18} />
              <span
                className={pathname.startsWith("/admin") ? "font-medium" : ""}
              >
                Admin Panel
              </span>
            </Link>
          )}

          {accountItems.map(({ label, icon: Icon, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                  ${
                    isActive
                      ? "bg-cyan-50 text-cyan-500"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <Icon size={18} />
                <span className={isActive ? "font-medium" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Section */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        {!user ? (
          <SidebarSkeleton />
        ) : (
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-100 overflow-hidden flex-shrink-0">
              <img
                src="/avatar.png"
                alt="avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-gray-800 text-sm font-medium">
                {user.name}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-3 mt-1">
          <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
            <Moon size={16} />
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideBar;
