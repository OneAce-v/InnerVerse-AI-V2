import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../AuthContext.tsx';
import { useLanguage, Language } from '../LanguageContext.tsx';
import {
  Activity, Brain, Moon, Apple, Heart, LogOut, MessageSquare, Settings, Flame, Trophy, Coins,
  LayoutDashboard, Network, TrendingUp, Users, Globe, Share2, Compass, Cpu, FlaskConical, Shield,
  ChevronDown, MoreHorizontal, X, Sparkles
} from 'lucide-react';
import { Button } from './ui/button.tsx';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.tsx';
import { Badge } from './ui/badge.tsx';
import { pageTransition } from '@/lib/motion';

interface NavItem {
  translationKey: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
  collapsible?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { translationKey: 'nav.dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { translationKey: 'nav.twin', name: 'Digital Twin', path: '/twin', icon: Network },
      { translationKey: 'nav.tracking', name: 'Smart Track', path: '/tracking', icon: Activity },
      { translationKey: 'nav.journal', name: 'Journal', path: '/journal', icon: Brain },
    ],
  },
  {
    label: 'AI Coach',
    items: [
      { translationKey: 'nav.coach', name: 'Coach Nova', path: '/chat', icon: MessageSquare },
      { translationKey: 'nav.ambient', name: 'Ambient AI', path: '/ambient', icon: Share2 },
    ],
  },
  {
    label: 'Autonomous Systems',
    collapsible: true,
    items: [
      { translationKey: 'nav.orchestration', name: 'Orchestrator', path: '/orchestration', icon: Compass },
      { translationKey: 'nav.lifeos', name: 'Life OS', path: '/lifeos', icon: Sparkles },
      { translationKey: 'nav.cognition', name: 'Cognition', path: '/cognition', icon: Cpu },
      { translationKey: 'nav.research', name: 'Research', path: '/research', icon: FlaskConical },
      { translationKey: 'nav.ecosystem', name: 'Ecosystem', path: '/ecosystem', icon: Globe },
    ],
  },
  {
    label: 'Community',
    items: [
      { translationKey: 'nav.analytics', name: 'Analytics', path: '/analytics', icon: TrendingUp },
      { translationKey: 'nav.community', name: 'Community', path: '/community', icon: Users },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { translationKey: 'nav.enterprise', name: 'Enterprise Platform', path: '/enterprise', icon: Shield },
  { translationKey: 'nav.settings', name: 'Settings', path: '/settings', icon: Settings },
];

const ALL_NAV_ITEMS = [...NAV_GROUPS.flatMap(g => g.items), ...FOOTER_ITEMS];

// Primary items surfaced directly in the mobile bottom bar; everything else lives
// behind "More" so mobile users aren't scanning 15 cramped icons at once.
const MOBILE_PRIMARY_PATHS = ['/', '/tracking', '/journal', '/chat'];

function NavLink({ item, isActive, layoutId, onClick }: { key?: React.Key; item: NavItem; isActive: boolean; layoutId: string; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link key={item.path} to={item.path} onClick={onClick}>
      <div className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        {isActive && (
          <motion.div
            layoutId={layoutId}
            className="absolute inset-0 rounded-xl bg-primary shadow-glow"
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          />
        )}
        <Icon className="w-4.5 h-4.5 relative shrink-0" />
        <span className="font-medium text-sm relative truncate">{item.name}</span>
      </div>
    </Link>
  );
}

export default function Layout() {
  const { user, logout, loading, getToken } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [advancedOpen, setAdvancedOpen] = useState(() => {
    try { return localStorage.getItem('nav-advanced-open') === 'true'; } catch { return false; }
  });
  const [moreOpen, setMoreOpen] = useState(false);

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

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const toggleAdvanced = () => {
    setAdvancedOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('nav-advanced-open', String(next)); } catch {}
      return next;
    });
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">{t("common.loading", "Loading...")}</span>
      </div>
    );
  }

  if (!user) return null;

  const displayProfile = profile || { level: 1, streakDays: 0, coins: 0 };
  const activeNavName = t(ALL_NAV_ITEMS.find(i => i.path === location.pathname)?.translationKey as any, ALL_NAV_ITEMS.find(i => i.path === location.pathname)?.name || 'InnerVerse');
  const mobilePrimaryItems = ALL_NAV_ITEMS.filter(i => MOBILE_PRIMARY_PATHS.includes(i.path))
    .sort((a, b) => MOBILE_PRIMARY_PATHS.indexOf(a.path) - MOBILE_PRIMARY_PATHS.indexOf(b.path));
  const mobileMoreItems = ALL_NAV_ITEMS.filter(i => !MOBILE_PRIMARY_PATHS.includes(i.path));
  const isMoreActive = mobileMoreItems.some(i => i.path === location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold truncate">{activeNavName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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

          <div className="flex items-center gap-1 text-orange-500 font-bold text-xs"><Flame className="w-4 h-4 fill-orange-500" /> {displayProfile.streakDays}</div>
          <div className="flex items-center gap-1 text-yellow-500 font-bold text-xs"><Coins className="w-4 h-4 fill-yellow-500" /> {displayProfile.coins}</div>
          <Button variant="ghost" size="icon" onClick={logout} className="rounded-full">
            <Avatar className="w-8 h-8 border-2 border-primary">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 backdrop-blur-md flex-col py-6 gap-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-4">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">InnerVerse AI</span>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 px-3 py-2 border border-border/80 bg-muted/40 rounded-xl relative hover:border-primary/20 transition-colors">
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

        <nav className="flex-1 px-4 flex flex-col gap-4 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && !group.collapsible && (
                <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
              )}
              {group.label && group.collapsible ? (
                <button
                  onClick={toggleAdvanced}
                  className="w-full flex items-center justify-between px-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  {group.label}
                  <motion.span animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </button>
              ) : null}
              <div className="flex flex-col gap-1">
                {(group.collapsible ? (advancedOpen ? group.items : []) : group.items).map((item) => (
                  <NavLink key={item.path} item={item} isActive={location.pathname === item.path} layoutId="nav-active-pill" />
                ))}
              </div>
              {group.collapsible && !advancedOpen && group.items.some(i => i.path === location.pathname) && (
                <div className="flex flex-col gap-1">
                  {group.items.filter(i => i.path === location.pathname).map((item) => (
                    <NavLink key={item.path} item={item} isActive layoutId="nav-active-pill" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="px-4 flex flex-col gap-1 border-t border-border/60 pt-4">
          {FOOTER_ITEMS.map((item) => (
            <NavLink key={item.path} item={item} isActive={location.pathname === item.path} layoutId="nav-active-pill" />
          ))}
        </div>

        <div className="px-4 space-y-3">
          <div className="flex justify-around items-center bg-muted/40 p-2 rounded-xl border border-border">
             <div className="flex flex-col items-center justify-center" title="Current Streak">
               <Flame className="w-5 h-5 text-orange-500 fill-orange-500 mb-0.5" />
               <span className="text-xs font-bold text-orange-500">{displayProfile.streakDays}</span>
             </div>
             <div className="w-px h-8 bg-border"></div>
             <div className="flex flex-col items-center justify-center" title="Total Coins">
               <Coins className="w-5 h-5 text-yellow-500 fill-yellow-500 mb-0.5" />
               <span className="text-xs font-bold text-yellow-500">{displayProfile.coins}</span>
             </div>
          </div>

          <div className="bg-muted rounded-xl p-3 flex items-center gap-3 relative">
             <div className="absolute -top-3 -right-2">
                <Badge className="bg-primary hover:bg-primary font-bold shadow-sm">{t("common.level", "Lv")} {displayProfile.level || 1}</Badge>
             </div>
            <Avatar className="border-2 border-primary/50 shadow-sm">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayProfile?.fitnessArchetype || user.email}</p>
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
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-6xl mx-auto p-4 md:p-8"
          >
            <ErrorBoundary compact>
              <Outlet />
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-md flex items-stretch z-50 py-1 px-1">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const displayName = t(item.translationKey as any, item.name);
          return (
            <Link key={item.path} to={item.path} className="flex-1 flex flex-col items-center justify-center py-1.5 gap-1">
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium text-center truncate w-full px-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{displayName}</span>
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen(true)} className="flex-1 flex flex-col items-center justify-center py-1.5 gap-1">
          <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] font-medium ${isMoreActive ? 'text-primary' : 'text-muted-foreground'}`}>{t("nav.more", "More")}</span>
        </button>
      </nav>

      {/* Mobile "More" Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 bg-black/40 z-[60]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-3xl border-t border-border max-h-[75vh] overflow-y-auto pb-8"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2 sticky top-0 bg-card">
                <span className="font-bold text-sm">More</span>
                <button onClick={() => setMoreOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 px-5 pt-2">
                {mobileMoreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const displayName = t(item.translationKey as any, item.name);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition-colors ${isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-semibold leading-tight">{displayName}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
