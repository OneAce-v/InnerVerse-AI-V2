import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../AuthContext.tsx';
import { useLanguage, Language } from '../LanguageContext.tsx';
import { Activity, Brain, Moon, Apple, Heart, LogOut, MessageSquare, Settings, Flame, Trophy, Coins, LayoutDashboard, Network, TrendingUp, Users, Globe, Share2, Compass, Cpu, FlaskConical, Shield } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.tsx';
import { Badge } from './ui/badge.tsx';

export default function Layout() {
  const { user, logout, loading, getToken } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        
        if (data.profile && data.profile.age && data.profile.primaryGoal && data.profile.dietType) {
          setProfile(data.profile);
        } else {
           navigate('/onboarding');
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (user) fetchProfile();
  }, [user, navigate, getToken]);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">{t("common.loading", "Loading...")}</div>;
  }

  if (!user) return null;

  const mockProfile = profile || { level: 1, streakDays: 5, coins: 150 };

  const navItems = [
    { translationKey: 'nav.dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { translationKey: 'nav.twin', name: 'Digital Twin', path: '/twin', icon: Network },
    { translationKey: 'nav.ambient', name: 'Ambient AI', path: '/ambient', icon: Share2 },
    { translationKey: 'nav.orchestration', name: 'Orchestrator', path: '/orchestration', icon: Compass },
    { translationKey: 'nav.lifeos', name: 'Life OS', path: '/lifeos', icon: Settings },
    { translationKey: 'nav.ecosystem', name: 'Ecosystem', path: '/ecosystem', icon: Globe },
    { translationKey: 'nav.cognition', name: 'Cognition', path: '/cognition', icon: Cpu },
    { translationKey: 'nav.research', name: 'Research', path: '/research', icon: FlaskConical },
    { translationKey: 'nav.enterprise', name: 'Enterprise Platform', path: '/enterprise', icon: Shield },
    { translationKey: 'nav.tracking', name: 'Smart Track', path: '/tracking', icon: Activity },
    { translationKey: 'nav.analytics', name: 'Analytics', path: '/analytics', icon: TrendingUp },
    { translationKey: 'nav.community', name: 'Community', path: '/community', icon: Users },
    { translationKey: 'nav.coach', name: 'Coach Nova', path: '/chat', icon: MessageSquare },
    { translationKey: 'nav.journal', name: 'Journal', path: '/journal', icon: Brain },
    { translationKey: 'nav.settings', name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">InnerVerse</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Lang Switch */}
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-0.5 bg-muted/60">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="text-xs bg-transparent border-none focus:outline-none focus:ring-0 font-bold cursor-pointer text-muted-foreground"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="de">DE</option>
            </select>
          </div>
          
          <div className="flex items-center gap-1 text-orange-500 font-bold text-xs"><Flame className="w-4 h-4 fill-orange-500" /> {mockProfile.streakDays}</div>
          <div className="flex items-center gap-1 text-yellow-500 font-bold text-xs"><Coins className="w-4 h-4 fill-yellow-500" /> {mockProfile.coins}</div>
          <Button variant="ghost" size="icon" onClick={logout} className="rounded-full">
            <Avatar className="w-8 h-8 border-2 border-primary">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 backdrop-blur-md flex-col items-center py-6 gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">InnerVerse AI</span>
        </div>
        
        {/* Globe Language Switcher */}
        <div className="w-full px-4">
          <div className="flex items-center gap-2 px-3 py-2 border border-border/80 bg-muted/40 rounded-xl relative hover:border-primary/20 transition-all">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-1">System Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="text-xs font-semibold bg-transparent border-none focus:outline-none p-0 cursor-pointer text-foreground w-full outline-none"
              >
                <option value="en" className="bg-card text-foreground">English (EN)</option>
                <option value="hi" className="bg-card text-foreground">हिन्दी (HI)</option>
                <option value="de" className="bg-card text-foreground">Deutsch (DE)</option>
              </select>
            </div>
          </div>
        </div>

        <nav className="flex-1 w-full px-4 flex flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const displayName = t(item.translationKey as any, item.name);
            return (
              <Link key={item.path} to={item.path}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]' : 'hover:bg-muted text-muted-foreground hover:scale-[1.02]'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{displayName}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="w-full px-4 pb-4 mt-auto space-y-4">
          {/* Quick Stats */}
          <div className="flex justify-around items-center bg-muted/40 p-2 rounded-xl border border-border">
             <div className="flex flex-col items-center justify-center" title="Current Streak">
               <Flame className="w-5 h-5 text-orange-500 fill-orange-500 mb-0.5" />
               <span className="text-xs font-bold text-orange-500">{mockProfile.streakDays}</span>
             </div>
             <div className="w-px h-8 bg-border"></div>
             <div className="flex flex-col items-center justify-center" title="Total Coins">
               <Coins className="w-5 h-5 text-yellow-500 fill-yellow-500 mb-0.5" />
               <span className="text-xs font-bold text-yellow-500">{mockProfile.coins}</span>
             </div>
          </div>

          <div className="bg-muted rounded-xl p-4 flex items-center gap-3 relative">
             <div className="absolute -top-3 -right-2">
                <Badge className="bg-primary hover:bg-primary font-bold shadow-sm">{t("common.level", "Lv")} {mockProfile.level || 1}</Badge>
             </div>
            <Avatar className="border-2 border-primary/50 shadow-sm">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{mockProfile?.fitnessArchetype || user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground border-dashed" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t("nav.signout", "Sign Out")}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-md flex items-center overflow-x-auto overflow-y-hidden z-50 scrollbar-hide py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const displayName = t(item.translationKey as any, item.name);
          return (
            <Link key={item.path} to={item.path} className={`flex-none flex flex-col items-center justify-center p-2 min-w-[72px] transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary' : 'opacity-70'}`} />
              <span className="text-[10px] font-medium text-center truncate w-full px-1">{displayName}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
