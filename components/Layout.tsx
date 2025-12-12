'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Moon, Sun, Turtle } from 'lucide-react';

const getInitialTheme = () => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export default function Layout({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState<boolean>(() => getInitialTheme());

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const classList = document.documentElement.classList;
        if (darkMode) {
            classList.add('dark');
        } else {
            classList.remove('dark');
        }
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('theme', darkMode ? 'dark' : 'light');
        }
    }, [darkMode]);

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="glass-card sticky top-0 z-50 m-4 px-6 py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Turtle className="w-8 h-8 text-accent-green" />
                    <span className="text-2xl font-bold tracking-tight">Turtelli</span>
                </Link>

                <nav className="flex items-center gap-6">
                    <Link href="/dashboard" className="font-medium hover:text-accent-green transition-colors">
                        Dashboard
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Toggle Theme"
                    >
                        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </nav>
            </header>

            <main className="flex-grow container mx-auto px-4 py-8">
                {children}
            </main>

            <footer className="py-8 text-center text-sm opacity-60 space-y-2">
                <p>© {new Date().getFullYear()} Turtelli. Trade Like a Turtle.</p>
                <p>Data from Twelve Data &amp; Finnhub.</p>
            </footer>
        </div>
    );
}
