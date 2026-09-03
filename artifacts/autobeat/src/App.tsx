import { memo, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AudioLines,
  ChevronRight,
  Check,
  CircleHelp,
  Disc3,
  FolderOpen,
  Headphones,
  LibraryBig,
  ListMusic,
  Menu,
  Moon,
  MoreHorizontal,
  Pause,
  Pencil,
  Palette,
  Play,
  Power,
  Radio,
  Repeat,
  RotateCcw,
  RotateCw,
  Search,
  Settings2,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Volume2,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Category = 'All tracks' | 'Hip-hop' | 'Beats' | 'Music' | 'Vocals' | 'Marathi playlists' | 'Soft music' | 'Personal playlist' | 'New files';
type RepeatMode = 'off' | 'one' | 'all';
type ThemeMode = 'light' | 'dark' | 'party';
type Track = {
  id: string;
  name: string;
  fileName: string;
  category: Exclude<Category, 'All tracks'>;
  sourcePath: string;
  file?: File;
  duration?: number;
  lastPlayedAt?: string;
  playCount: number;
  demo?: boolean;
};
type Settings = {
  folderPath: string;
  defaultTrackId: string;
  autoStart: boolean;
  keepPlayingInBackground: boolean;
  autoPlayOnHeadphones: boolean;
  pauseOnDisconnect: boolean;
  resumeLastTrack: boolean;
  pauseDuringCalls: boolean;
  resumeAfterCall: boolean;
};
type Playback = {
  currentTrackId: string;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
};
type AudioStatus = 'unknown' | 'system' | 'headphones' | 'unsupported';

const queryClient = new QueryClient();
const DEMO_TRACKS: Track[] = [
  { id: 'demo-beats', name: 'Midnight practice loop', fileName: 'Beats demo', category: 'Beats', sourcePath: 'Demo preview · add a folder to play', demo: true, duration: 188, playCount: 0 },
  { id: 'demo-soft', name: 'A quiet place to begin', fileName: 'Soft music demo', category: 'Soft music', sourcePath: 'Demo preview · add a folder to play', demo: true, duration: 264, playCount: 0 },
  { id: 'demo-hiphop', name: 'Keep the pace', fileName: 'Hip-hop demo', category: 'Hip-hop', sourcePath: 'Demo preview · add a folder to play', demo: true, duration: 221, playCount: 0 },
];
const STORAGE_TRACKS = 'autobeat-tracks';
const STORAGE_SETTINGS = 'autobeat-settings';
const STORAGE_PLAYBACK = 'autobeat-playback';
const DEFAULT_SETTINGS: Settings = {
  folderPath: '',
  defaultTrackId: '',
  autoStart: false,
  keepPlayingInBackground: true,
  autoPlayOnHeadphones: true,
  pauseOnDisconnect: true,
  resumeLastTrack: true,
  pauseDuringCalls: true,
  resumeAfterCall: true,
};
const DEFAULT_PLAYBACK: Playback = {
  currentTrackId: 'demo-focus',
  isPlaying: false,
  currentTime: 0,
  volume: 0.72,
  repeatMode: 'off',
  shuffle: false,
};
const STORAGE_THEME = 'autobeat-theme';
const LIBRARY_CATEGORIES: Exclude<Category, 'All tracks'>[] = ['Hip-hop', 'Beats', 'Music', 'Vocals', 'Marathi playlists', 'Soft music', 'Personal playlist', 'New files'];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch { return fallback; }
}
function formatTime(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}
function categoryFromName(name: string): Exclude<Category, 'All tracks'> {
  const lower = name.toLowerCase();
  if (lower.includes('beat') || lower.includes('loop') || lower.includes('instrumental')) return 'Beats';
  if (lower.includes('hip') || lower.includes('rap') || lower.includes('trap')) return 'Hip-hop';
  if (lower.includes('vocal') || lower.includes('voice') || lower.includes('singer')) return 'Vocals';
  if (lower.includes('marathi') || lower.includes('lavani') || lower.includes('abhang')) return 'Marathi playlists';
  if (lower.includes('soft') || lower.includes('calm') || lower.includes('chill') || lower.includes('ambient')) return 'Soft music';
  if (lower.includes('personal') || lower.includes('mine')) return 'Personal playlist';
  if (lower.includes('song') || lower.includes('music')) return 'Music';
  return 'New files';
}
function normalizeCategory(category: string, name: string): Exclude<Category, 'All tracks'> {
  if (LIBRARY_CATEGORIES.includes(category as Exclude<Category, 'All tracks'>)) return category as Exclude<Category, 'All tracks'>;
  if (category === 'Focus') return 'Soft music';
  if (category === 'Workout') return 'Hip-hop';
  if (category === 'Songs') return 'Music';
  return categoryFromName(`${name} ${category}`);
}

function AppShell({ children, currentTrack, isPlaying, player }: { children: ReactNode; currentTrack?: Track; isPlaying: boolean; player: ReturnType<typeof usePlayer> }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const ThemeIcon = player.theme === 'light' ? Sun : player.theme === 'dark' ? Moon : Palette;
  const nextTheme = player.theme === 'light' ? 'dark' : player.theme === 'dark' ? 'party' : 'light';
  const navItems = [
    { href: '/', label: 'Now playing', icon: Radio },
    { href: '/library', label: 'Library', icon: LibraryBig },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ];
  return (
    <div className={`app-noise min-h-[100dvh] bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-foreground ${player.theme === 'dark' ? 'dark' : player.theme === 'party' ? 'party' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-border bg-card/95 px-5 py-6 backdrop-blur-xl transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <Link href="/" data-testid="link-logo" className="flex items-center gap-3 text-foreground no-underline">
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-primary text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/.22)]"><AudioLines size={20} strokeWidth={2.4} /></span>
            <span><strong className="font-display text-[20px] tracking-[-.04em]">AutoBeat</strong><span className="mt-0.5 block font-mono-custom text-[9px] uppercase tracking-[.2em] text-muted-foreground">private listening room</span></span>
          </Link>
          <button className="rounded-lg p-1 text-muted-foreground md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu"><X size={18} /></button>
        </div>
        <div className="mt-12">
          <p className="mb-3 px-2 font-mono-custom text-[9px] uppercase tracking-[.2em] text-muted-foreground">Your space</p>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold no-underline transition-colors ${location === href ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'}`}>
                <Icon size={17} strokeWidth={location === href ? 2.4 : 1.8} />
                {label}
                {location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto rounded-2xl border border-border bg-secondary/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-primary"><Headphones size={15} /><span className="font-mono-custom text-[9px] uppercase tracking-[.14em]">Headphone watch</span></div>
           <p className="text-[12px] leading-relaxed text-muted-foreground">{player.audioStatus === 'unsupported' ? 'This browser does not expose output-device events.' : 'AutoBeat is watching the audio outputs this browser can see.'}</p>
           <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-foreground"><span className={`h-2 w-2 rounded-full ${player.audioStatus === 'headphones' ? 'bg-accent' : 'bg-primary'}`} /> {player.audioStatus === 'headphones' ? 'Headphones connected' : player.audioStatus === 'unsupported' ? 'Browser limited' : 'Ready when you are'}</div>
        </div>
        <div className="mt-5 flex items-center gap-2 px-2 font-mono-custom text-[9px] uppercase tracking-[.13em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Local only · no account</div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-overlay-close" />}
      <div className="md:pl-[250px]">
        <header className="flex h-[76px] items-center justify-between border-b border-border/80 px-5 md:px-10">
          <button className="rounded-xl p-2 text-muted-foreground hover:bg-secondary md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-[12px] text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Everything stays on this device</div>
          <div className="ml-auto flex items-center gap-3">
             <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground sm:flex"><Volume2 size={14} /><span className="font-mono-custom">Output: {player.audioStatus === 'headphones' ? 'Headphones' : 'System default'}</span></div>
             <button onClick={() => player.setTheme(nextTheme as ThemeMode)} className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground" aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`} data-testid="button-theme-toggle"><ThemeIcon size={15} /><span className="hidden lg:inline">{player.theme === 'party' ? 'Party' : player.theme === 'dark' ? 'Dark' : 'Light'}</span></button>
            <Link href="/settings" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground" data-testid="link-header-settings"><SlidersHorizontal size={16} /></Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1340px] px-5 py-8 md:px-10 md:py-12">{children}</main>
        <MiniPlayer player={player} track={currentTrack} isPlaying={isPlaying} />
      </div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[.18em] text-primary"><span className="h-px w-5 bg-primary/60" />{children}</div>;
}

function TrackGlyph({ active = false, category }: { active?: boolean; category: string }) {
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-primary'}`}><Disc3 size={20} className={active ? 'animate-[spin_5s_linear_infinite]' : ''} /><span className="sr-only">{category}</span></span>;
}

function SoundBars({ active = false, compact = false }: { active?: boolean; compact?: boolean }) {
  const heights = compact ? [9, 15, 11, 18, 12] : [22, 38, 28, 48, 31, 43, 20, 36, 25, 44, 29, 18];
  return <div className={`flex items-end gap-1 ${compact ? 'h-5' : 'h-12'}`} aria-label={active ? 'Music is playing' : 'Music is paused'}>{heights.map((height, index) => <span key={index} className={`w-1 rounded-full bg-accent ${active ? 'sound-bar' : 'opacity-40'}`} style={{ height: compact ? height * .55 : height, animationDelay: `${index * 70}ms` }} />)}</div>;
}

function TrackRow({ track, active, isPlaying, onPlay, onDefault, onEdit }: { track: Track; active: boolean; isPlaying: boolean; onPlay: () => void; onDefault: () => void; onEdit?: () => void }) {
  return (
    <div className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all ${active ? 'border-primary/35 bg-primary/[.06]' : 'border-transparent hover:border-border hover:bg-card'}`} data-testid={`row-track-${track.id}`}>
      <button onClick={onPlay} className="relative" aria-label={`${isPlaying && active ? 'Pause' : 'Play'} ${track.name}`} data-testid={`button-play-${track.id}`}>
        <TrackGlyph active={active} category={track.category} />
        <span className={`absolute inset-0 grid place-items-center rounded-[13px] bg-foreground/35 text-primary-foreground transition-opacity ${active || 'opacity-0 group-hover:opacity-100'}`}>{isPlaying && active ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</span>
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={onPlay} data-testid={`button-select-${track.id}`}>
        <p className="truncate text-[13px] font-bold">{track.name}</p>
        <p className="mt-1 truncate font-mono-custom text-[10px] text-muted-foreground">{track.fileName} · {track.category} · {track.playCount} {track.playCount === 1 ? 'play' : 'plays'}{track.duration ? ` · ${formatTime(track.duration)}` : ''}</p>
      </button>
      {track.demo && <span className="hidden rounded-full bg-secondary px-2 py-1 font-mono-custom text-[9px] uppercase tracking-wider text-muted-foreground sm:block">preview</span>}
      {active && isPlaying && <span className="mr-2 flex items-end gap-[2px]"><i className="h-2 w-[2px] animate-[pulse_1s_ease-in-out_infinite] bg-accent" /><i className="h-3.5 w-[2px] animate-[pulse_1.2s_ease-in-out_infinite] bg-accent" /><i className="h-2.5 w-[2px] animate-[pulse_.8s_ease-in-out_infinite] bg-accent" /></span>}
      {!track.demo && onEdit && <button onClick={onEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Edit ${track.name}`} data-testid={`button-edit-${track.id}`}><Pencil size={15} /></button>}
      <button onClick={onDefault} className={`rounded-lg p-2 transition-colors ${track.demo || track.category !== 'Beats' ? 'text-muted-foreground/40' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`} disabled={track.demo || track.category !== 'Beats'} aria-label={`Set ${track.name} as default beat`} title={track.category === 'Beats' ? 'Set as default beat' : 'Only Beats can autoplay on headphones'} data-testid={`button-default-${track.id}`}><MoreHorizontal size={17} /></button>
    </div>
  );
}

function usePlayer() {
  const [tracks, setTracks] = useState<Track[]>(() => readStorage<Track[]>(STORAGE_TRACKS, DEMO_TRACKS).map((track) => ({ ...track, category: normalizeCategory(track.category, track.name), playCount: track.playCount || 0 })));
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...readStorage<Partial<Settings>>(STORAGE_SETTINGS, {}) }));
  const [playback, setPlayback] = useState<Playback>(() => readStorage(STORAGE_PLAYBACK, DEFAULT_PLAYBACK));
  const [notice, setNotice] = useState('');
  const [callStatus, setCallStatus] = useState<'idle' | 'active'>('idle');
  const [theme, setTheme] = useState<ThemeMode>(() => readStorage(STORAGE_THEME, 'light'));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryHandleRef = useRef<any>(null);
  const tracksRef = useRef(tracks);
  const playTrackRef = useRef<(track: Track, fromQueue?: boolean) => void>(() => undefined);
  const settingsRef = useRef(settings);
  const playbackRef = useRef(playback);
  const currentTrackRef = useRef<Track | undefined>(undefined);
  const callStatusRef = useRef<'idle' | 'active'>('idle');
  const wasPlayingBeforeCallRef = useRef(false);
  const outputSignatureRef = useRef('');
  const outputStatusRef = useRef<AudioStatus>('unknown');
  const outputTimerRef = useRef<number | undefined>(undefined);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('unknown');
  tracksRef.current = tracks;
  settingsRef.current = settings;
  playbackRef.current = playback;
  callStatusRef.current = callStatus;

  useEffect(() => { localStorage.setItem(STORAGE_TRACKS, JSON.stringify(tracks.map(({ file, ...track }) => track))); }, [tracks]);
  useEffect(() => { localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE_PLAYBACK, JSON.stringify(playback)); }, [playback]);
  useEffect(() => { localStorage.setItem(STORAGE_THEME, theme); }, [theme]);
  useEffect(() => {
    const audio = new Audio();
    audio.volume = playback.volume;
    audioRef.current = audio;
    const sync = () => { playbackRef.current.currentTime = audio.currentTime; };
    const ended = () => setPlayback((p) => {
      if (p.repeatMode === 'one') { audio.currentTime = 0; void audio.play(); return { ...p, isPlaying: true, currentTime: 0 }; }
      const available = tracksRef.current.filter((t) => !t.demo);
      const index = available.findIndex((t) => t.id === p.currentTrackId);
      const next = p.shuffle ? available[Math.floor(Math.random() * available.length)] : available[index + 1] || (p.repeatMode === 'all' ? available[0] : undefined);
      if (next) { queueMicrotask(() => playTrackRef.current(next, true)); return { ...p, currentTrackId: next.id, currentTime: 0, isPlaying: true }; }
      return { ...p, isPlaying: false, currentTime: 0 };
    });
    audio.addEventListener('timeupdate', sync); audio.addEventListener('ended', ended);
    return () => { audio.pause(); audio.removeEventListener('timeupdate', sync); audio.removeEventListener('ended', ended); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
    // audio intentionally mounts once; track transitions are handled by playTrack.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentTrack = tracks.find((track) => track.id === playback.currentTrackId) || tracks.find((track) => track.id === settings.defaultTrackId) || tracks[0];
  currentTrackRef.current = currentTrack;
  function playTrack(track: Track, fromQueue = false) {
    setPlayback((p) => ({ ...p, currentTrackId: track.id, currentTime: fromQueue ? 0 : p.currentTrackId === track.id ? p.currentTime : 0, isPlaying: !track.demo }));
    if (track.demo) { audioRef.current?.pause(); setNotice('Preview track only — choose your local folder to play real audio.'); window.setTimeout(() => setNotice(''), 3800); return; }
    if (!track.file) { setNotice('This local file needs to be selected again before it can play.'); window.setTimeout(() => setNotice(''), 3800); setPlayback((p) => ({ ...p, isPlaying: false })); return; }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(track.file);
    const audio = audioRef.current!;
    audio.src = objectUrl.current;
    audio.currentTime = playback.currentTrackId === track.id && !fromQueue ? playback.currentTime : 0;
    audio.volume = playback.volume;
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) setTracks((items) => items.map((item) => item.id === track.id ? { ...item, duration: audio.duration } : item));
    };
    void audio.play().catch(() => setNotice('Playback needs a quick click to start in this browser.'));
    setTracks((items) => items.map((item) => item.id === track.id ? { ...item, lastPlayedAt: new Date().toISOString(), playCount: item.playCount + 1 } : item));
  }
  playTrackRef.current = playTrack;
  function togglePlay() {
    if (!currentTrack) return;
    if (currentTrack.demo) { playTrack(currentTrack); return; }
    const audio = audioRef.current!;
    if (playback.isPlaying) { audio.pause(); setPlayback((p) => ({ ...p, isPlaying: false, currentTime: audio.currentTime })); }
    else { void audio.play(); setPlayback((p) => ({ ...p, isPlaying: true })); }
  }
  function stop() { audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; setPlayback((p) => ({ ...p, isPlaying: false, currentTime: 0 })); }
  function step(direction: 1 | -1) {
    const real = tracks.filter((track) => !track.demo);
    if (!real.length) { setNotice('Your local library is ready for its first track.'); window.setTimeout(() => setNotice(''), 3000); return; }
    const index = Math.max(0, real.findIndex((track) => track.id === playback.currentTrackId));
    const next = real[(index + direction + real.length) % real.length];
    playTrack(next);
  }
  function setVolume(value: number) { setPlayback((p) => ({ ...p, volume: value })); if (audioRef.current) audioRef.current.volume = value; }
  async function scanFiles(files: File[], preservePlayback = false) {
    const audioFiles = files.filter((file) => /\.(mp3|wav|m4a|flac)$/i.test(file.name));
    const found = audioFiles.map((file, index): Track => {
      const id = `${file.name}-${file.size}-${index}`;
      const previous = tracksRef.current.find((track) => track.id === id);
      return { id, name: previous?.name || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '), fileName: file.name, category: previous?.category || categoryFromName(file.name), sourcePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name, file, playCount: previous?.playCount || 0, lastPlayedAt: previous?.lastPlayedAt };
    });
    if (!found.length) { setNotice('No MP3, WAV, M4A, or FLAC files found in that folder.'); window.setTimeout(() => setNotice(''), 3500); return; }
    setTracks(found);
     setSettings((s) => ({ ...s, folderPath: files[0].webkitRelativePath?.split('/')[0] || 'Selected local folder', defaultTrackId: s.defaultTrackId && found.some((t) => t.id === s.defaultTrackId && t.category === 'Beats') ? s.defaultTrackId : '' }));
    setPlayback((p) => {
      const preferredId = settingsRef.current.defaultTrackId;
      const currentId = preservePlayback && found.some((track) => track.id === p.currentTrackId)
        ? p.currentTrackId
         : found.some((track) => track.id === preferredId && track.category === 'Beats')
          ? preferredId
          : found[0].id;
      return { ...p, currentTrackId: currentId, currentTime: preservePlayback ? p.currentTime : 0, isPlaying: preservePlayback ? p.isPlaying : false };
    });
    if (!preservePlayback) {
      setNotice(`${found.length} local track${found.length === 1 ? '' : 's'} ready.`);
      window.setTimeout(() => setNotice(''), 3200);
    }
  }
  async function readDirectory(handle: any) {
    const files: File[] = [];
    async function walk(directory: any) {
      for await (const entry of directory.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (/\.(mp3|wav|m4a|flac)$/i.test(file.name)) files.push(file);
        } else if (entry.kind === 'directory') await walk(entry);
      }
    }
    await walk(handle);
    return files;
  }
  async function refreshDirectory() {
    if (!directoryHandleRef.current) return;
    try {
      const permission = await directoryHandleRef.current.queryPermission?.({ mode: 'read' });
      if (permission === 'denied') return;
      const files = await readDirectory(directoryHandleRef.current);
      await scanFiles(files, true);
    } catch {
      // The browser may revoke a directory handle after the tab sleeps; the next manual scan can restore it.
    }
  }
  async function chooseFolder() {
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker;
    if (picker) {
      try {
        const handle = await picker();
        directoryHandleRef.current = handle;
        await scanFiles(await readDirectory(handle));
      } catch (error) { if ((error as Error).name !== 'AbortError') setNotice('This folder could not be opened. Try selecting it again.'); }
    } else {
      setNotice('Folder access is limited here. Choose a directory-enabled file selection instead.');
      fileInputRef.current?.click();
    }
  }
  useEffect(() => {
    const interval = window.setInterval(() => { void refreshDirectory(); }, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshDirectory(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
    // The directory handle is intentionally kept in memory for this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !settingsRef.current.keepPlayingInBackground && playbackRef.current.isPlaying) {
        audioRef.current?.pause();
        setPlayback((playback) => ({ ...playback, isPlaying: false }));
        setNotice('Background playback is turned off in settings.');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
  useEffect(() => {
    const mediaSession = navigator.mediaSession;
    if (!mediaSession) return;
    mediaSession.metadata = currentTrack && !currentTrack.demo
      ? new MediaMetadata({ title: currentTrack.name, artist: 'AutoBeat', album: currentTrack.category })
      : null;
    const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => { if (!playbackRef.current.isPlaying) togglePlay(); }],
      ['pause', () => { if (playbackRef.current.isPlaying) togglePlay(); }],
      ['stop', stop],
      ['previoustrack', () => step(-1)],
      ['nexttrack', () => step(1)],
    ];
    actions.forEach(([action, handler]) => {
      try { mediaSession.setActionHandler(action, handler); } catch { /* Some browsers expose only a subset of actions. */ }
    });
    mediaSession.playbackState = playback.isPlaying ? 'playing' : 'paused';
    return () => {
      actions.forEach(([action]) => {
        try { mediaSession.setActionHandler(action, null); } catch { /* Ignore unsupported actions. */ }
      });
    };
    // Media-session handlers intentionally use refs to avoid stale playback state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, playback.isPlaying]);
  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.enumerateDevices) { setAudioStatus('unsupported'); return; }
    let disposed = false;
    async function inspectOutputs() {
      try {
        const outputs = (await mediaDevices.enumerateDevices()).filter((device) => device.kind === 'audiooutput');
        const signature = outputs.map((device) => `${device.deviceId}:${device.label}`).sort().join('|');
        const changed = Boolean(outputSignatureRef.current) && signature !== outputSignatureRef.current;
        outputSignatureRef.current = signature;
        const hasHeadphones = outputs.some((device) => /headphone|earphone|earbud|headset|airpod|bluetooth|usb audio/i.test(device.label));
        const nextStatus: AudioStatus = hasHeadphones ? 'headphones' : 'system';
        const previousStatus = outputStatusRef.current;
        outputStatusRef.current = nextStatus;
        if (!disposed) setAudioStatus(nextStatus);
        if (!changed || previousStatus === nextStatus) return;
        if (hasHeadphones && settingsRef.current.autoPlayOnHeadphones && !playbackRef.current.isPlaying) {
          const beats = tracksRef.current.filter((track) => !track.demo && track.category === 'Beats');
          const target = beats.find((track) => track.id === settingsRef.current.defaultTrackId) || [...beats].sort((a, b) => b.playCount - a.playCount || (b.lastPlayedAt || '').localeCompare(a.lastPlayedAt || ''))[0];
          if (!target && !disposed) setNotice('Headphones connected — add a track to Beats for automatic playback.');
          if (target) playTrackRef.current(target);
        } else if (!hasHeadphones && settingsRef.current.pauseOnDisconnect && playbackRef.current.isPlaying) {
          audioRef.current?.pause();
          setPlayback((playback) => ({ ...playback, isPlaying: false }));
          setNotice('Headphones disconnected — playback paused.');
        }
      } catch {
        if (!disposed) setAudioStatus('unsupported');
      }
    }
    void inspectOutputs();
    const onDeviceChange = () => {
      if (outputTimerRef.current) window.clearTimeout(outputTimerRef.current);
      outputTimerRef.current = window.setTimeout(() => { void inspectOutputs(); }, 350);
    };
    mediaDevices.addEventListener?.('devicechange', onDeviceChange);
    return () => {
      disposed = true;
      if (outputTimerRef.current) window.clearTimeout(outputTimerRef.current);
      mediaDevices.removeEventListener?.('devicechange', onDeviceChange);
    };
    // The listener reads refs so repeated device events do not recreate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onCallStart = () => {
      if (callStatusRef.current === 'active') return;
      wasPlayingBeforeCallRef.current = playbackRef.current.isPlaying;
      setCallStatus('active');
      if (settingsRef.current.pauseDuringCalls && playbackRef.current.isPlaying) {
        audioRef.current?.pause();
        setPlayback((playback) => ({ ...playback, isPlaying: false }));
        setNotice('Call detected — playback paused.');
      }
    };
    const onCallEnd = () => {
      if (callStatusRef.current !== 'active') return;
      setCallStatus('idle');
      const shouldResume = wasPlayingBeforeCallRef.current && settingsRef.current.pauseDuringCalls && settingsRef.current.resumeAfterCall;
      wasPlayingBeforeCallRef.current = false;
      if (shouldResume && currentTrackRef.current && !currentTrackRef.current.demo) playTrackRef.current(currentTrackRef.current);
    };
    window.addEventListener('autobeat:call-start', onCallStart);
    window.addEventListener('autobeat:call-end', onCallEnd);
    return () => {
      window.removeEventListener('autobeat:call-start', onCallStart);
      window.removeEventListener('autobeat:call-end', onCallEnd);
    };
  }, []);
  function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) { setSettings((s) => ({ ...s, [key]: value })); }
  function updateTrack(id: string, changes: Partial<Track>) {
    setTracks((items) => items.map((track) => track.id === id ? { ...track, ...changes } : track));
  }
  return { tracks, settings, playback, currentTrack, audioStatus, callStatus, theme, setTheme, notice, fileInputRef, audioRef, playTrack, togglePlay, stop, step, setVolume, chooseFolder, scanFiles, setSetting, setPlayback, setNotice, updateTrack };
}

const ProgressControls = memo(function ProgressControls({ audioRef, trackId, fallbackDuration, setPlayback }: {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  trackId?: string;
  fallbackDuration?: number;
  setPlayback: Dispatch<SetStateAction<Playback>>;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration || 0);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const sync = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : fallbackDuration || 0);
    };
    sync();
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('loadedmetadata', sync);
    audio.addEventListener('durationchange', sync);
    return () => {
      audio.removeEventListener('timeupdate', sync);
      audio.removeEventListener('loadedmetadata', sync);
      audio.removeEventListener('durationchange', sync);
    };
  }, [audioRef, trackId, fallbackDuration]);
  const changeTime = (nextTime: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(nextTime)) return;
    const next = Math.max(0, Math.min(nextTime, duration || nextTime));
    audio.currentTime = next;
    setCurrentTime(next);
    setPlayback((playback) => ({ ...playback, currentTime: next }));
  };
  return <div className="mt-8 rounded-2xl border border-border bg-secondary/45 p-4" data-testid="playback-progress-controls">
    <div className="flex items-center gap-3">
      <span className="w-10 font-mono-custom text-[10px] text-muted-foreground">{formatTime(currentTime)}</span>
      <input className="range-teal h-1.5 min-w-0 flex-1" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || currentTime)} onChange={(event) => changeTime(Number(event.target.value))} disabled={!duration} aria-label="Track progress" data-testid="input-track-progress" />
      <span className="w-10 text-right font-mono-custom text-[10px] text-muted-foreground">{formatTime(duration)}</span>
    </div>
    <div className="mt-3 flex items-center justify-center gap-4">
      <button onClick={() => changeTime(currentTime - 10)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Backward 10 seconds" data-testid="button-seek-backward"><RotateCcw size={14} /> 10</button>
      <button onClick={() => changeTime(currentTime + 10)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Forward 10 seconds" data-testid="button-seek-forward">10 <RotateCw size={14} /></button>
    </div>
  </div>;
}, (previous, next) => previous.trackId === next.trackId && previous.fallbackDuration === next.fallbackDuration);

function PlayerControls({ player, compact = false }: { player: ReturnType<typeof usePlayer>; compact?: boolean }) {
  const { playback, currentTrack } = player;
  return <div className={`flex items-center ${compact ? 'gap-2' : 'gap-5'}`}>
    <button onClick={() => player.setPlayback((p) => ({ ...p, shuffle: !p.shuffle }))} className={`rounded-lg p-2 transition-colors ${playback.shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} aria-label="Toggle shuffle" data-testid="button-shuffle"><Shuffle size={compact ? 14 : 17} /></button>
    <button onClick={() => player.step(-1)} className="rounded-lg p-2 text-foreground hover:bg-secondary" aria-label="Previous track" data-testid="button-previous"><SkipBack size={compact ? 17 : 20} fill="currentColor" /></button>
    <button onClick={player.togglePlay} className={`${compact ? 'h-10 w-10' : 'h-14 w-14'} grid place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_22px_hsl(var(--primary)/.27)] transition-transform hover:scale-105 active:scale-95`} aria-label={playback.isPlaying ? 'Pause' : 'Play'} data-testid="button-play-toggle">{playback.isPlaying ? <Pause size={compact ? 17 : 21} fill="currentColor" /> : <Play size={compact ? 17 : 21} fill="currentColor" className="ml-0.5" />}</button>
    <button onClick={() => player.step(1)} className="rounded-lg p-2 text-foreground hover:bg-secondary" aria-label="Next track" data-testid="button-next"><SkipForward size={compact ? 17 : 20} fill="currentColor" /></button>
    {!compact && <button onClick={() => player.setPlayback((p) => ({ ...p, repeatMode: p.repeatMode === 'off' ? 'all' : p.repeatMode === 'all' ? 'one' : 'off' }))} className={`rounded-lg p-2 ${playback.repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} aria-label="Change repeat mode" data-testid="button-repeat"><Repeat size={17} /><span className="sr-only">{playback.repeatMode}</span></button>}
    {!compact && currentTrack && <button onClick={player.stop} className="rounded-lg p-2 text-muted-foreground hover:text-foreground" aria-label="Stop playback" data-testid="button-stop"><Square size={15} fill="currentColor" /></button>}
  </div>;
}

function MiniPlayer({ player, track, isPlaying }: { player: ReturnType<typeof usePlayer>; track?: Track; isPlaying: boolean }) {
  const [location] = useLocation();
  return <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_30px_rgba(59,69,73,.06)] backdrop-blur-xl md:left-[250px] md:px-8">
    <div className="mx-auto flex max-w-[1340px] items-center gap-4">
      <TrackGlyph active={isPlaying} category={track?.category || 'Focus'} />
      <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{track?.name || 'Nothing queued'}</p><p className="truncate font-mono-custom text-[9px] uppercase tracking-wider text-muted-foreground">{track?.demo ? 'Preview library' : track?.category || 'Choose a folder'}</p></div>
      <div className="hidden sm:block"><PlayerControls player={player} compact /></div>
      <div className="hidden w-36 items-center gap-2 lg:flex"><Volume2 size={14} className="text-muted-foreground" /><input className="range-teal h-1 w-full" type="range" min="0" max="1" step=".01" value={player.playback.volume} onChange={(event) => player.setVolume(Number(event.target.value))} aria-label="Mini player volume" data-testid="input-mini-volume" /></div>
      {location !== '/' && <Link href="/" className="hidden items-center gap-1 text-[11px] font-bold text-primary no-underline sm:flex" data-testid="link-open-player">Open player <ChevronRight size={13} /></Link>}
    </div>
  </div>;
}
function TrackEditor({ track, onSave, onCancel }: { track: Track; onSave: (changes: Pick<Track, 'name' | 'category'>) => void; onCancel: () => void }) {
  const [name, setName] = useState(track.name);
  const [category, setCategory] = useState<Exclude<Category, 'All tracks'>>(track.category);
  return <div className="ml-14 rounded-2xl border border-primary/20 bg-secondary/55 p-4" data-testid={`editor-track-${track.id}`}>
    <div className="mb-3 flex items-center gap-2"><Pencil size={13} className="text-primary" /><p className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-primary">Organize this track</p></div>
    <div className="grid gap-3 sm:grid-cols-[1fr_190px_auto]">
      <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-[12px] font-semibold outline-none focus:border-primary" aria-label={`Rename ${track.name}`} data-testid={`input-rename-${track.id}`} />
      <select value={category} onChange={(event) => setCategory(event.target.value as Exclude<Category, 'All tracks'>)} className="h-10 rounded-lg border border-border bg-card px-3 text-[11px] font-semibold outline-none focus:border-primary" aria-label={`Category for ${track.name}`} data-testid={`select-category-${track.id}`}>{LIBRARY_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <div className="flex items-center gap-2"><button onClick={() => onSave({ name: name.trim() || track.name, category })} className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground" aria-label="Save track details" data-testid={`button-save-track-${track.id}`}><Check size={15} /></button><button onClick={onCancel} className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground" aria-label="Cancel editing" data-testid={`button-cancel-track-${track.id}`}><X size={15} /></button></div>
    </div>
    <p className="mt-2 text-[10px] text-muted-foreground">This changes AutoBeat’s library label only. Your original file is never moved or renamed.</p>
  </div>;
}
function HomePage({ player }: { player: ReturnType<typeof usePlayer> }) {
  const realTracks = player.tracks.filter((track) => !track.demo);
  const recentlyPlayed = [...realTracks].sort((a, b) => (b.lastPlayedAt || '').localeCompare(a.lastPlayedAt || '')).slice(0, 4);
  return <div className="rise-in pb-28">
    <section className="relative overflow-hidden rounded-[28px] border border-border bg-card px-6 py-8 md:px-10 md:py-11">
      <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-accent/15 blur-3xl ambient-orb" /><div className="absolute right-24 top-20 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative grid items-center gap-9 lg:grid-cols-[1fr_390px]">
        <div><SectionEyebrow>Good to have you back</SectionEyebrow><h1 className="max-w-[680px] font-display text-4xl font-bold leading-[.98] tracking-[-.065em] md:text-[64px]">Let the room<br /><span className="text-primary">find its rhythm.</span></h1><p className="mt-6 max-w-[470px] text-[14px] leading-7 text-muted-foreground">Your local music, ready without the ceremony. Pick a track, put your headphones on, and get into the work.</p><div className="mt-8 flex flex-wrap items-center gap-3"><Link href="/library" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[12px] font-bold text-primary-foreground no-underline shadow-[0_8px_18px_hsl(var(--primary)/.2)]" data-testid="link-browse-library">Browse your library <ChevronRight size={15} /></Link><Link href="/settings" className="rounded-xl border border-border px-5 py-3 text-[12px] font-bold text-foreground no-underline hover:bg-secondary" data-testid="link-open-settings">Tune the room</Link></div></div>
        <div className="soft-grid relative min-h-[245px] overflow-hidden rounded-[22px] border border-border bg-secondary/55 p-5">
          <div className="flex items-center justify-between"><span className="font-mono-custom text-[9px] uppercase tracking-[.18em] text-muted-foreground">Current session</span><span className="flex items-center gap-1.5 font-mono-custom text-[9px] uppercase text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {player.playback.isPlaying ? 'Playing' : 'Standing by'}</span></div>
           <div className={`absolute left-1/2 top-[51%] grid h-[142px] w-[142px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/20 bg-card shadow-[0_12px_40px_hsl(var(--primary)/.12)] ${player.playback.isPlaying ? 'beat-pulse' : ''}`}><div className="grid h-[112px] w-[112px] place-items-center rounded-full border border-dashed border-accent/60"><SoundBars active={player.playback.isPlaying} /><span className="absolute h-2 w-2 rounded-full bg-accent" /></div></div>
          <div className="absolute bottom-5 left-5 right-5"><p className="truncate text-center font-display text-[16px] font-bold">{player.currentTrack?.name || 'Choose your first track'}</p><p className="mt-1 text-center font-mono-custom text-[9px] uppercase tracking-wider text-muted-foreground">{player.currentTrack?.demo ? 'A small preview, not a playable file' : player.currentTrack?.category || 'Local audio'}</p></div>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-[560px]"><ProgressControls audioRef={player.audioRef} trackId={player.currentTrack?.id} fallbackDuration={player.currentTrack?.duration} setPlayback={player.setPlayback} /><div className="mt-5 flex justify-center"><PlayerControls player={player} /></div></div>
    </section>
    <section className="mt-10 grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-[24px] border border-border bg-card p-5 md:p-7"><div className="mb-5 flex items-end justify-between"><div><SectionEyebrow>In the room</SectionEyebrow><h2 className="font-display text-2xl font-bold tracking-[-.04em]">Ready when you are</h2></div><Link href="/library" className="text-[11px] font-bold text-primary no-underline" data-testid="link-see-all-tracks">See all <ChevronRight className="inline" size={13} /></Link></div>{recentlyPlayed.length ? recentlyPlayed.map((track) => <TrackRow key={track.id} track={track} active={track.id === player.playback.currentTrackId} isPlaying={player.playback.isPlaying} onPlay={() => player.playTrack(track)} onDefault={() => player.setSetting('defaultTrackId', track.id)} />) : <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-5 py-8 text-center"><Sparkles className="mx-auto mb-3 text-accent" size={22} /><p className="text-[13px] font-bold">Your room is quiet for now.</p><p className="mx-auto mt-2 max-w-[260px] text-[11px] leading-5 text-muted-foreground">Choose a local audio folder and your recent tracks will settle here.</p><Link href="/settings" className="mt-4 inline-flex rounded-lg bg-foreground px-3 py-2 text-[11px] font-bold text-background no-underline" data-testid="link-choose-folder-empty">Choose a folder</Link></div>}</div>
      <div className="rounded-[24px] bg-primary p-6 text-primary-foreground md:p-7"><SectionEyebrow>One small ritual</SectionEyebrow><h2 className="font-display text-3xl font-bold leading-tight tracking-[-.05em]">Your headphones<br />can start the moment.</h2><p className="mt-4 max-w-[290px] text-[13px] leading-6 text-primary-foreground/70">Opt into headphone autoplay in settings. AutoBeat watches what the browser can see, without pretending to be your operating system.</p><Link href="/settings" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-3 text-[11px] font-bold text-primary-foreground no-underline ring-1 ring-primary-foreground/20 hover:bg-primary-foreground/20" data-testid="link-headphone-settings">Review headphone settings <ChevronRight size={14} /></Link><div className="mt-9 flex items-end gap-1 opacity-60">{[18,31,14,42,25,51,22,37,15,29,19,44,26,35].map((height, index) => <span key={index} className="w-1 rounded-full bg-accent-foreground/70" style={{ height }} />)}</div></div>
    </section>
  </div>;
}

function LibraryPage({ player }: { player: ReturnType<typeof usePlayer> }) {
  const [query, setQuery] = useState(''); const [category, setCategory] = useState<Category>('All tracks'); const [editingId, setEditingId] = useState<string | null>(null);
  const filtered = useMemo(() => player.tracks.filter((track) => (category === 'All tracks' || track.category === category) && `${track.name} ${track.fileName}`.toLowerCase().includes(query.toLowerCase())), [player.tracks, query, category]);
  return <div className="rise-in pb-28"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><SectionEyebrow>Local library</SectionEyebrow><h1 className="font-display text-4xl font-bold tracking-[-.06em] md:text-5xl">Your sound, <span className="text-primary">sorted.</span></h1><p className="mt-3 text-[13px] text-muted-foreground">Only files from your chosen folder appear here. Nothing leaves this device.</p></div><button onClick={player.chooseFolder} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[12px] font-bold text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/.18)]" data-testid="button-scan-library"><FolderOpen size={16} /> Scan a folder</button></div>
     <div className="mt-9 flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary" placeholder="Find a track by name or file…" aria-label="Search local library" data-testid="input-search-library" /></label><div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">{(['All tracks', ...LIBRARY_CATEGORIES] as Category[]).map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold ${category === item ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`} data-testid={`button-filter-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}</div></div>
     <div className="mt-8 rounded-[24px] border border-border bg-card p-4 md:p-6"><div className="mb-4 flex items-center justify-between px-2"><span className="font-mono-custom text-[10px] uppercase tracking-[.15em] text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'track' : 'tracks'} in view</span><span className="flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-[.15em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> local index</span></div>{filtered.map((track) => <div key={track.id}><TrackRow track={track} active={player.playback.currentTrackId === track.id} isPlaying={player.playback.isPlaying} onPlay={() => player.playTrack(track)} onDefault={() => player.setSetting('defaultTrackId', track.id)} onEdit={() => setEditingId(editingId === track.id ? null : track.id)} />{editingId === track.id && <TrackEditor track={track} onSave={(changes) => { player.updateTrack(track.id, changes); if (track.id === player.settings.defaultTrackId && changes.category !== 'Beats') player.setSetting('defaultTrackId', ''); setEditingId(null); }} onCancel={() => setEditingId(null)} />}</div>)}{!filtered.length && <div className="py-16 text-center"><Search className="mx-auto mb-4 text-muted-foreground" size={25} /><p className="text-[14px] font-bold">Nothing matches that search.</p><button onClick={() => { setQuery(''); setCategory('All tracks'); }} className="mt-3 text-[11px] font-bold text-primary" data-testid="button-clear-search">Clear search</button></div>}</div>
    <input ref={player.fileInputRef} type="file" className="hidden" accept=".mp3,.wav,.m4a,.flac,audio/*" multiple onChange={(event) => player.scanFiles(Array.from(event.target.files || []))} {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} data-testid="input-folder-fallback" />
  </div>;
}

function SettingToggle({ label, description, checked, onChange, testId }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; testId: string }) {
  return <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-transparent p-4 transition-colors hover:border-border hover:bg-secondary/45"><span><span className="block text-[13px] font-bold">{label}</span><span className="mt-1 block max-w-[540px] text-[11px] leading-5 text-muted-foreground">{description}</span></span><span className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" data-testid={testId} /><span className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} /></span></label>;
}

function SettingsPage({ player }: { player: ReturnType<typeof usePlayer> }) {
  return <div className="rise-in pb-28"><div><SectionEyebrow>Room settings</SectionEyebrow><h1 className="font-display text-4xl font-bold tracking-[-.06em] md:text-5xl">Make it <span className="text-primary">yours.</span></h1><p className="mt-3 max-w-[540px] text-[13px] leading-6 text-muted-foreground">A few quiet preferences to make local listening feel immediate. They are saved only in this browser.</p></div>
    <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_310px]"><div className="space-y-5">
       <section className="rounded-[24px] border border-border bg-card p-5 md:p-7"><div className="mb-5 flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><FolderOpen size={17} /></span><div><h2 className="font-display text-lg font-bold">Audio folder</h2><p className="mt-1 text-[11px] text-muted-foreground">The one place AutoBeat looks for local sound.</p></div></div><div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-mono-custom text-[10px] uppercase tracking-wider text-muted-foreground">Current folder</p><p className="mt-1 truncate text-[13px] font-bold">{player.settings.folderPath || 'No folder chosen yet'}</p></div><button onClick={player.chooseFolder} className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-[11px] font-bold text-background" data-testid="button-choose-audio-folder"><FolderOpen size={14} /> {player.settings.folderPath ? 'Choose another' : 'Choose folder'}</button></div><p className="mt-3 flex gap-2 text-[10px] leading-5 text-muted-foreground"><CircleHelp className="mt-0.5 shrink-0" size={13} /> MP3, WAV, M4A and FLAC are supported. Folder scanning stays local.</p></section>
       <section className="rounded-[24px] border border-border bg-card p-5 md:p-7"><div className="mb-4 flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Palette size={17} /></span><div><h2 className="font-display text-lg font-bold">Room mood</h2><p className="mt-1 text-[11px] text-muted-foreground">Choose the light, dark, or colorful party look.</p></div></div><div className="grid gap-2 sm:grid-cols-3">{(['light', 'dark', 'party'] as ThemeMode[]).map((mode) => <button key={mode} onClick={() => player.setTheme(mode)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${player.theme === mode ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`} aria-pressed={player.theme === mode} data-testid={`button-theme-${mode}`}>{mode === 'light' ? <Sun size={16} /> : mode === 'dark' ? <Moon size={16} /> : <Sparkles size={16} />}<span><span className="block text-[11px] font-bold capitalize">{mode}</span><span className="block text-[9px]">{mode === 'party' ? 'Colorful pulse' : mode === 'dark' ? 'Late-night room' : 'Daylight room'}</span></span></button>)}</div></section>
       <section className="rounded-[24px] border border-border bg-card p-5 md:p-7"><div className="mb-3 flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Power size={17} /></span><div><h2 className="font-display text-lg font-bold">Startup behavior</h2><p className="mt-1 text-[11px] text-muted-foreground">Decide how the room should greet you.</p></div></div><SettingToggle label="Start AutoBeat quietly" description="Restore the room without beginning playback when this page opens." checked={player.settings.autoStart} onChange={(value) => player.setSetting('autoStart', value)} testId="checkbox-auto-start" /><SettingToggle label="Resume your last track" description="Keep your place in the last local track between visits." checked={player.settings.resumeLastTrack} onChange={(value) => player.setSetting('resumeLastTrack', value)} testId="checkbox-resume-last-track" /><SettingToggle label="Keep playing in the background" description="Do not pause when this app is minimized, hidden, or your phone screen turns off." checked={player.settings.keepPlayingInBackground} onChange={(value) => player.setSetting('keepPlayingInBackground', value)} testId="checkbox-background-playback" /></section>
       <section className="rounded-[24px] border border-border bg-card p-5 md:p-7"><div className="mb-3 flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Headphones size={17} /></span><div><h2 className="font-display text-lg font-bold">Calls</h2><p className="mt-1 text-[11px] text-muted-foreground">Lectures and videos do not interrupt listening. Calls do.</p></div></div><SettingToggle label="Pause during calls" description="Pause only when the native device reports an active call." checked={player.settings.pauseDuringCalls} onChange={(value) => player.setSetting('pauseDuringCalls', value)} testId="checkbox-pause-during-calls" /><SettingToggle label="Resume after the call" description="Return to the same track and position when the call ends." checked={player.settings.resumeAfterCall} onChange={(value) => player.setSetting('resumeAfterCall', value)} testId="checkbox-resume-after-call" /><div className="mt-3 flex items-start gap-2 rounded-xl bg-accent/10 p-3 text-[10px] leading-5 text-muted-foreground"><CircleHelp className="mt-0.5 shrink-0 text-accent" size={13} />{player.callStatus === 'active' ? 'Call active — playback is paused.' : 'Waiting for a native call-state event. The browser preview cannot see cellular calls.'}</div></section>
      <section className="rounded-[24px] border border-border bg-card p-5 md:p-7"><div className="mb-3 flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Headphones size={17} /></span><div><h2 className="font-display text-lg font-bold">Headphones</h2><p className="mt-1 text-[11px] text-muted-foreground">Browser-compatible output awareness, always opt-in.</p></div></div><SettingToggle label="Autoplay when headphones connect" description="When the browser reports a new audio output, begin your default track." checked={player.settings.autoPlayOnHeadphones} onChange={(value) => player.setSetting('autoPlayOnHeadphones', value)} testId="checkbox-headphone-autoplay" /><SettingToggle label="Pause on disconnect" description="Pause playback when the output device disappears." checked={player.settings.pauseOnDisconnect} onChange={(value) => player.setSetting('pauseOnDisconnect', value)} testId="checkbox-pause-disconnect" /><div className="mt-3 flex items-start gap-2 rounded-xl bg-accent/10 p-3 text-[10px] leading-5 text-muted-foreground"><CircleHelp className="mt-0.5 shrink-0 text-accent" size={13} />Full Windows device detection is not available to browser apps. AutoBeat watches the audio outputs this browser exposes.</div></section>
     </div><aside className="space-y-5"><div className="rounded-[24px] bg-secondary p-6"><SectionEyebrow>Default beat</SectionEyebrow><h2 className="font-display text-2xl font-bold leading-tight tracking-[-.04em]">Give the room<br />a first pulse.</h2><p className="mt-3 text-[11px] leading-5 text-muted-foreground">Only a track in Beats can start automatically when headphones connect. If you leave this blank, AutoBeat prefers your most repeated beat.</p><select value={player.settings.defaultTrackId} onChange={(event) => player.setSetting('defaultTrackId', event.target.value)} className="mt-5 w-full rounded-xl border border-border bg-card px-3 py-3 text-[11px] font-bold outline-none focus:border-primary" aria-label="Default beat" data-testid="select-default-track"><option value="">Most repeated beat</option>{player.tracks.filter((track) => !track.demo && track.category === 'Beats').map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select><div className="mt-5 flex items-center gap-2 text-[10px] text-muted-foreground"><span className={`h-2 w-2 rounded-full ${player.settings.defaultTrackId ? 'bg-primary' : 'bg-muted-foreground/40'}`} />{player.settings.defaultTrackId ? 'Default beat set' : 'Most repeated beat will lead'}</div></div><div className="rounded-[24px] border border-border bg-card p-6"><div className="flex items-center gap-2 text-primary"><ListMusic size={16} /><span className="font-mono-custom text-[10px] uppercase tracking-widest">At a glance</span></div><div className="mt-5 space-y-4">{[['Tracks indexed', player.tracks.filter((t) => !t.demo).length.toString()], ['Total plays', player.tracks.reduce((sum, track) => sum + track.playCount, 0).toString()], ['Formats', '4 supported'], ['Storage', 'This device only']].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"><span className="text-[11px] text-muted-foreground">{label}</span><span className="font-mono-custom text-[10px] font-medium">{value}</span></div>)}</div></div></aside></div>
  </div>;
}

function Router() {
  const player = usePlayer();
  return <AppShell player={player} currentTrack={player.currentTrack} isPlaying={player.playback.isPlaying}><Switch><Route path="/" component={() => <HomePage player={player} />} /><Route path="/library" component={() => <LibraryPage player={player} />} /><Route path="/settings" component={() => <SettingsPage player={player} />} /><Route component={() => <div className="py-20 text-center"><h1 className="font-display text-4xl font-bold">That room does not exist.</h1><Link href="/" className="mt-4 inline-block text-primary no-underline" data-testid="link-back-home">Back to now playing</Link></div>} /></Switch>{player.notice && <div className="fixed bottom-[76px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-[11px] font-semibold text-background shadow-xl" role="status" data-testid="status-notice"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{player.notice}<button onClick={() => player.setNotice('')} aria-label="Dismiss notice" data-testid="button-dismiss-notice"><X size={14} /></button></div>}</AppShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><ErrorBoundary resetKey={location.pathname}><Router /></ErrorBoundary><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;