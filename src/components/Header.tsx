import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRecord, AppSettings } from '../types';
import {  
  LogOut, Settings, ShoppingBag, Image, Video, Layers, Wand2, 
  BadgeCheck, Maximize, Lock, Scissors, Menu, X as CloseIcon, 
  Zap, Sparkles, Info, Search, ChevronDown, ChevronUp, Check, LayoutGrid, 
  Command, Wand, Cpu, Repeat, RefreshCw, User, GitBranch, Pin, PinOff,
  BookOpen, Eye, EyeOff, ChevronLeft, ChevronRight, Grid, Star, Globe, Crown,
  AlertTriangle, AlertCircle, Film, SlidersHorizontal
} from 'lucide-react';
import { calculateSubscriptionInfo } from '../utils/subscriptionUtils';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from './LanguageTranslatorWidget';
import { CURRENT_APP_VERSION, BUILD_NUMBER } from '../utils/versionControl';
import { VersionInfoModal } from './VersionInfoModal';
import { useStarredTools } from '../utils/starredTools';
import { useThemeDimensions } from '../contexts/ThemeDimensionsContext';
import { PWAAndroidActionButtons } from './PWAAndroidActionButtons';
import { 
  TOOLS_REGISTRY, 
  TOOL_FEATURE_MAP, 
  CATEGORIES_CONFIG, 
  ToolRegistryItem, 
  ToolCategory 
} from '../config/toolsRegistry';

export type ToolDefinition = ToolRegistryItem;

export interface CategoryDefinition {
  id: ToolCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
  tools: ToolDefinition[];
}

export interface HeaderProps {
  onOpenGuide?: () => void;
  onLogoClick: () => void;
  isAdmin: boolean;
  currentUser: UserRecord | null;
  settings: AppSettings | null;
  onAdminToggle: () => void;
  onLogout: () => void;
  isAdminOpen: boolean;
  onBatchOpen: () => void;
  onConverterOpen: () => void;
  onImageConverterOpen: () => void;
  onImageEditorOpen: () => void;
  onImageMatcherOpen: () => void;
  onCropperOpen: () => void;
  onSvgaExOpen: () => void;
  onMultiSvgaOpen: () => void;
  onImageProcessorOpen: () => void;
  onImageEnhancerOpen: () => void;
  onBatchImageProcessorOpen: () => void;
  onUniversalConverterOpen: () => void;
  onName3DEditorOpen: () => void;
  onAudioExtractorOpen: () => void;
  onAiVideoMattingOpen?: () => void;
  onImageCollageStudioOpen?: () => void;
  onSvgaBatchCompressorOpen?: () => void;
  onSvgaLayerEditorOpen?: () => void;
  onAnimationManagerOpen?: () => void;
  onStoreOpen?: () => void;
  onAfterEffectsStudioOpen?: () => void;
  onApkExtractorOpen?: () => void;
  onSmartMp4StudioOpen?: () => void;
  onVapHubOpen?: () => void;
  onVideoDurationSpeedOpen?: () => void;
  onBatchImageOpen: () => void;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onVipClick?: () => void;
  onBatchSvgaConverterOpen?: () => void;
  currentTab: string;
  onOpenFile?: (files: File[]) => void;
}

export const Header: React.FC<HeaderProps> = (props) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);
  const [allToolsSearch, setAllToolsSearch] = useState('');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [infoModalTool, setInfoModalTool] = useState<ToolDefinition | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);
  const moreToolsMenuRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useLanguage();
  const { activeThemeConfig, zoomScale, setIsModalOpen: setIsThemeDimensionsModalOpen } = useThemeDimensions();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (moreToolsMenuRef.current && !moreToolsMenuRef.current.contains(e.target as Node)) {
        setIsMoreToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Starred / Pinned Tools State
  const { starredToolIds, isStarred, toggleStar } = useStarredTools();
  const [starToast, setStarToast] = useState<{ message: string; visible: boolean } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleStar = (tool: ToolDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleStar(tool.id);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setStarToast({
      message: newState
        ? `تم تثبيت "${tool.label}" بنجمة في البداية ⭐`
        : `تم إلغاء تثبيت "${tool.label}" من البداية`,
      visible: true
    });
    toastTimeoutRef.current = setTimeout(() => {
      setStarToast(null);
    }, 2200);
  };

  // Drag-to-scroll state for header navigation
  const [isNavDragging, setIsNavDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragDistance = useRef(0);

  // Auto-hide & Hover Reveal State
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('header_pinned');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default to pinned so navigation is always visible on all devices
  });
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterHeader = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeaveHeader = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 350);
  };

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    localStorage.setItem('header_pinned', String(next));
  };

  // Always fixed and visible across all features as requested by user
  const isHeaderVisible = true;

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live subscription info calculation for current user
  const headerSubInfo = useMemo(() => {
    return props.currentUser ? calculateSubscriptionInfo(props.currentUser) : null;
  }, [props.currentUser]);

  // Feature Access Control check
  const isFeatureAllowed = (toolId: string) => {
    if (toolId === 'after-effects-studio' || toolId === 'afterEffectsStudio') return true;
    if (toolId === 'svga-layer-editor' || toolId === 'svgaLayerEditor') return true;
    if (toolId === 'image-collage-studio' || toolId === 'imageCollageStudio') return true;
    if (toolId === 'apk-extractor' || toolId === 'apkExtractor') return true;
    if (toolId === 'smart-mp4-studio' || toolId === 'smartMp4Studio') return true;
    if (!props.currentUser) return true;
    if (props.currentUser.allFeaturesEnabled !== false) return true;
    const allowed = props.currentUser.allowedFeatures || [];
    const featureKey = TOOL_FEATURE_MAP[toolId] || toolId;
    return allowed.includes(featureKey) || featureKey === 'afterEffectsStudio' || featureKey === 'svgaLayerEditor' || featureKey === 'imageCollageStudio' || featureKey === 'apkExtractor' || featureKey === 'smartMp4Studio';
  };

  // Dynamic allowed tools from unified TOOLS_REGISTRY
  const allTools = useMemo(() => {
    return TOOLS_REGISTRY.filter(t => isFeatureAllowed(t.id));
  }, [props.currentUser]);

  // Separate top bar tools: 3 core hero tools in fixed section, all remaining tools in scrollable area
  const { starredNavTools, unstarredNavTools } = useMemo(() => {
    const validTools = allTools.filter(t => !t.hideFromTopNav && t.id !== 'pag-to-svga');
    
    // Always place after-effects-studio, svga-layer-editor, and image-collage-studio prominently in primary section
    const aeTool = validTools.find(t => t.id === 'after-effects-studio');
    const layerEditorTool = validTools.find(t => t.id === 'svga-layer-editor');
    const collageTool = validTools.find(t => t.id === 'image-collage-studio');

    const primaryFixed: ToolDefinition[] = [];
    if (aeTool) primaryFixed.push(aeTool);
    if (layerEditorTool) primaryFixed.push(layerEditorTool);
    if (collageTool) primaryFixed.push(collageTool);
    
    // Remaining tools in scrollable area, with user-starred tools placed first
    const remaining = validTools.filter(t => !primaryFixed.some(st => st.id === t.id));
    const starredRemaining = remaining.filter(t => starredToolIds.includes(t.id));
    const nonStarredRemaining = remaining.filter(t => !starredToolIds.includes(t.id));
    const sortedScrollable = [...starredRemaining, ...nonStarredRemaining];

    return { starredNavTools: primaryFixed, unstarredNavTools: sortedScrollable };
  }, [allTools, starredToolIds]);

  // Combined topNavTools for references
  const topNavTools = useMemo(() => {
    return [...starredNavTools, ...unstarredNavTools];
  }, [starredNavTools, unstarredNavTools]);

  // Dynamic visible categories
  const visibleCategories = useMemo(() => {
    const catKeys = (['svga', 'image', 'audio', 'batch', 'store'] as ToolCategory[]);
    return catKeys.map(catId => {
      const config = CATEGORIES_CONFIG[catId];
      return {
        id: catId,
        label: config.label,
        icon: config.icon,
        color: catId,
        tools: allTools.filter(t => t.category === catId)
      };
    }).filter(cat => cat.tools.length > 0);
  }, [allTools]);

  const displayedNavTools = useMemo(() => {
    if (selectedCategory === 'all') return allTools;
    return allTools.filter(t => t.category === selectedCategory);
  }, [allTools, selectedCategory]);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allTools.filter(t => 
      t.label.toLowerCase().includes(query) || 
      t.descAr.toLowerCase().includes(query) || 
      t.descEn.toLowerCase().includes(query)
    );
  }, [searchQuery, allTools]);

  const filteredModalTools = useMemo(() => {
    if (!allToolsSearch.trim()) return allTools;
    const q = allToolsSearch.toLowerCase();
    return allTools.filter(t => 
      t.label.toLowerCase().includes(q) || 
      t.descAr.toLowerCase().includes(q) || 
      t.descEn.toLowerCase().includes(q) ||
      t.categoryNameAr.toLowerCase().includes(q)
    );
  }, [allToolsSearch, allTools]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsAllToolsOpen(false);
        setInfoModalTool(null);
        setActiveMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [isSearchOpen]);

  const handleToolClick = (tool: ToolDefinition) => {
    // Check if external link is configured in settings
    const extLinks = props.settings?.externalLinks;
    if (tool.id === 'store' && extLinks?.storeLink?.enabled && extLinks.storeLink.url) {
      const url = extLinks.storeLink.url;
      const target = extLinks.storeLink.openInNewTab !== false ? '_blank' : '_self';
      window.open(url.startsWith('http') ? url : `https://${url}`, target, 'noopener,noreferrer');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsAllToolsOpen(false);
      setActiveMenu(null);
      return;
    }
    if ((tool.id === 'svga-ex' || tool.id === 'svga-layer-editor') && extLinks?.svgaEditorLink?.enabled && extLinks.svgaEditorLink.url) {
      const url = extLinks.svgaEditorLink.url;
      const target = extLinks.svgaEditorLink.openInNewTab !== false ? '_blank' : '_self';
      window.open(url.startsWith('http') ? url : `https://${url}`, target, 'noopener,noreferrer');
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsAllToolsOpen(false);
      setActiveMenu(null);
      return;
    }

    const action = props[tool.actionKey] as () => void;
    if (action) action();
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsAllToolsOpen(false);
    setActiveMenu(null);
  };

  const scrollRef = useRef<HTMLElement>(null);
  const continuousScrollRef = useRef<NodeJS.Timeout | null>(null);
  const [isRibbonExpanded, setIsRibbonExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('header_ribbon_expanded') === 'true';
    }
    return false;
  });

  const toggleRibbonExpanded = () => {
    setIsRibbonExpanded(prev => {
      const next = !prev;
      localStorage.setItem('header_ribbon_expanded', String(next));
      return next;
    });
  };

  // Auto-scroll logic: smoothly centers the active tool into view from left to right (whether starred or unstarred)
  useEffect(() => {
    if (scrollRef.current && props.currentTab && !isRibbonExpanded) {
      const activeElement = scrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [props.currentTab, isRibbonExpanded]);

  const handleNavWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (scrollRef.current && !isRibbonExpanded) {
      // In RTL layout, scrolling wheel down (deltaY > 0) should move left (negative scrollLeft)
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY;
      scrollRef.current.scrollLeft += delta * 1.4;
    }
  };

  // Drag to scroll handlers (works smoothly even when grabbing directly on buttons)
  const handleNavMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    // Only ignore if clicking the star toggle directly
    if ((e.target as HTMLElement).closest('[data-interactive="true"]')) {
      return;
    }
    if (!scrollRef.current || isRibbonExpanded) return;
    setIsNavDragging(true);
    dragStartX.current = e.pageX;
    dragScrollLeft.current = scrollRef.current.scrollLeft;
    dragDistance.current = 0;
  };

  const handleNavMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isNavDragging || !scrollRef.current) return;
    const deltaX = e.pageX - dragStartX.current;
    dragDistance.current = Math.abs(deltaX);
    if (dragDistance.current > 4) {
      scrollRef.current.scrollLeft = dragScrollLeft.current - deltaX * 1.25;
    }
  };

  const handleNavMouseUp = () => {
    if (isNavDragging) {
      setTimeout(() => {
        setIsNavDragging(false);
      }, 20);
    }
  };

  const handleNavScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollStep = 340;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollStep : scrollStep,
        behavior: 'smooth'
      });
    }
  };

  const startContinuousScroll = (direction: 'left' | 'right') => {
    stopContinuousScroll();
    continuousScrollRef.current = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += direction === 'left' ? -18 : 18;
      }
    }, 16);
  };

  const stopContinuousScroll = () => {
    if (continuousScrollRef.current) {
      clearInterval(continuousScrollRef.current);
      continuousScrollRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopContinuousScroll();
  }, []);

  // Next and Previous Tool Navigation for Unstarred/Moving Tools
  const currentUnstarredIndex = useMemo(() => {
    if (!props.currentTab) return -1;
    const unstarredIdx = unstarredNavTools.findIndex(t => t.id === props.currentTab);
    if (unstarredIdx !== -1) return unstarredIdx;
    return topNavTools.findIndex(t => t.id === props.currentTab);
  }, [props.currentTab, unstarredNavTools, topNavTools]);

  const prevTool = useMemo(() => {
    const list = unstarredNavTools.length > 0 ? unstarredNavTools : topNavTools;
    if (list.length === 0) return null;
    if (currentUnstarredIndex === -1) return list[list.length - 1];
    const prevIdx = (currentUnstarredIndex - 1 + list.length) % list.length;
    return list[prevIdx];
  }, [currentUnstarredIndex, unstarredNavTools, topNavTools]);

  const nextTool = useMemo(() => {
    const list = unstarredNavTools.length > 0 ? unstarredNavTools : topNavTools;
    if (list.length === 0) return null;
    if (currentUnstarredIndex === -1) return list[0];
    const nextIdx = (currentUnstarredIndex + 1) % list.length;
    return list[nextIdx];
  }, [currentUnstarredIndex, unstarredNavTools, topNavTools]);

  const handleNavToolStep = (direction: 'prev' | 'next') => {
    const targetTool = direction === 'next' ? nextTool : prevTool;
    if (targetTool) {
      handleToolClick(targetTool);
      if (scrollRef.current) {
        const el = scrollRef.current.querySelector<HTMLElement>(`[data-tool-id="${targetTool.id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        setTimeout(() => {
          const updatedEl = scrollRef.current?.querySelector<HTMLElement>(`[data-tool-id="${targetTool.id}"]`);
          if (updatedEl) {
            updatedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }, 50);
      }
    }
  };

  const renderNavToolButton = (tool: ToolDefinition, isItemStarred: boolean) => {
    const isToolActive = props.currentTab === tool.id;
    const isAfterEffects = tool.id === 'after-effects-studio';
    const isLayerEditor = tool.id === 'svga-layer-editor';
    const isCollageStudio = tool.id === 'image-collage-studio';
    const isVipFeature = Boolean(tool.isVip || isLayerEditor || props.settings?.vibFeatures?.includes(tool.id));
    const displayLabel = tool.shortLabel || tool.label;

    return (
      <div
        key={tool.id}
        className="relative group shrink-0 select-none flex items-center"
      >
        <button
          type="button"
          data-active={isToolActive}
          data-tool-id={tool.id}
          onClick={(e) => {
            e.stopPropagation();
            if (dragDistance.current > 6) return;
            handleToolClick(tool);
          }}
          className={`h-9 px-2.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl transition-all duration-150 select-none cursor-pointer shrink-0 whitespace-nowrap border text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
            isAfterEffects
              ? isToolActive
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-300/60 shadow-[0_4px_16px_rgba(225,29,72,0.45)]'
                : 'bg-rose-950/45 hover:bg-rose-900/60 text-rose-100 hover:text-white border-rose-500/40 hover:border-rose-400/70'
              : isLayerEditor
                ? isToolActive
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black border-amber-200 shadow-[0_4px_16px_rgba(245,158,11,0.4)]'
                  : 'bg-amber-950/40 hover:bg-amber-900/55 text-amber-100 hover:text-white border-amber-500/40 hover:border-amber-400/70'
              : isCollageStudio
                ? isToolActive
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black border-cyan-200 shadow-[0_4px_16px_rgba(6,182,212,0.4)]'
                  : 'bg-cyan-950/40 hover:bg-cyan-900/55 text-cyan-100 hover:text-white border-cyan-500/40 hover:border-cyan-400/70'
              : isToolActive 
                ? isVipFeature
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black border-amber-200 shadow-[0_4px_14px_rgba(245,158,11,0.35)]'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-300/50 shadow-[0_4px_14px_rgba(79,70,229,0.4)]'
                : isVipFeature
                  ? 'bg-amber-500/[0.08] hover:bg-amber-500/[0.16] text-amber-200 hover:text-white border-amber-500/30 hover:border-amber-400/60'
                  : isItemStarred
                    ? 'bg-indigo-500/[0.1] hover:bg-indigo-500/[0.18] text-indigo-100 hover:text-white border-indigo-400/30 hover:border-indigo-400/60'
                    : 'bg-[#0f172a]/80 hover:bg-[#1e293b] text-slate-200 hover:text-white border-white/[0.08] hover:border-white/[0.2]'
          }`}
          title={
            isToolActive
              ? `${tool.label} (نشطة حالياً)`
              : isVipFeature
                ? `${tool.label} — ${tool.descAr} (👑 ميزة VIP)`
                : isItemStarred 
                  ? `${tool.label} — ${tool.descAr} (أداة مثبتة بنجمة)` 
                  : `${tool.label} — ${tool.descAr}`
          }
        >
          <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
            isToolActive
              ? 'bg-black/15'
              : isAfterEffects
                ? 'bg-rose-500/20 text-rose-300'
                : isLayerEditor || isVipFeature
                  ? 'bg-amber-500/20 text-amber-300'
                  : isCollageStudio
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-white/[0.06]'
          }`}>
            {isAfterEffects ? (
              <Film className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            ) : isLayerEditor ? (
              <Layers className={`w-3.5 h-3.5 shrink-0 ${isToolActive ? 'text-slate-950' : 'text-amber-400'}`} />
            ) : isCollageStudio ? (
              <LayoutGrid className={`w-3.5 h-3.5 shrink-0 ${isToolActive ? 'text-slate-950' : 'text-cyan-300'}`} />
            ) : (
              React.cloneElement(tool.icon as React.ReactElement<any>, { className: 'w-3.5 h-3.5 shrink-0' })
            )}
          </span>
          
          <span className="whitespace-nowrap shrink-0 tracking-tight">{displayLabel}</span>
          
          {isAfterEffects ? (
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-500/30 text-rose-100 border border-rose-400/40 shrink-0 leading-none">
              PRO
            </span>
          ) : isCollageStudio ? (
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 leading-none select-none ${
              isToolActive ? 'bg-slate-950/20 text-slate-950' : 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/30'
            }`}>
              جديد
            </span>
          ) : isVipFeature ? (
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 leading-none select-none ${
              isToolActive
                ? 'bg-slate-950/20 text-slate-950'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
            }`}>
              VIP
            </span>
          ) : null}

          {/* Star Icon Toggle - Zero dead space when unstarred, smooth reveal on hover */}
          {!isAfterEffects && !isLayerEditor && (
            <span
              data-interactive="true"
              onClick={(e) => handleToggleStar(tool, e)}
              className={`rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0 ${
                isItemStarred
                  ? 'w-4 h-4 opacity-100 ms-0.5 hover:scale-125'
                  : 'w-0 h-4 overflow-hidden opacity-0 group-hover:w-4 group-hover:opacity-100 group-hover:ms-0.5 text-slate-400 hover:text-amber-400'
              }`}
              title={isItemStarred ? 'أداة مثبتة بنجمة ⭐ (انقر لإلغاء التثبيت)' : 'تثبيت هذه الأداة بنجمة ⭐'}
            >
              <Star
                className={`w-3 h-3 transition-colors ${
                  isItemStarred
                    ? 'text-amber-400 fill-amber-400'
                    : 'hover:text-amber-400 hover:fill-amber-400/40'
                }`}
              />
            </span>
          )}
        </button>
      </div>
    );
  };

  const [activeBarFilter, setActiveBarFilter] = useState<'all' | 'starred' | 'svga' | 'image' | 'batch'>('all');

  const filteredRibbonUnstarredTools = useMemo(() => {
    if (activeBarFilter === 'all') return unstarredNavTools;
    if (activeBarFilter === 'starred') return unstarredNavTools.filter(t => isStarred(t.id));
    if (activeBarFilter === 'batch') return unstarredNavTools.filter(t => t.category === 'batch' || t.category === 'audio' || t.category === 'store');
    return unstarredNavTools.filter(t => t.category === activeBarFilter);
  }, [unstarredNavTools, activeBarFilter, starredToolIds]);

  const filteredRibbonStarredTools = useMemo(() => {
    if (activeBarFilter === 'all' || activeBarFilter === 'starred') return starredNavTools;
    if (activeBarFilter === 'batch') return starredNavTools.filter(t => t.category === 'batch' || t.category === 'audio' || t.category === 'store');
    return starredNavTools.filter(t => t.category === activeBarFilter);
  }, [starredNavTools, activeBarFilter]);

  return (
    <>
      {/* --- Star Pin Feedback Toast --- */}
      <AnimatePresence>
        {starToast && starToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-[2500] px-4 py-2.5 rounded-2xl bg-slate-950/95 border border-amber-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold text-amber-300 pointer-events-none"
            dir="rtl"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span>{starToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible Top Hover Zone - reveals header when mouse moves to very top of window */}
      {!isPinned && (
        <div 
          onMouseEnter={handleMouseEnterHeader}
          className="fixed top-0 left-0 right-0 h-3 z-[999] pointer-events-auto"
        />
      )}

      {/* Floating Trigger Notch / Pill - appears when header is auto-hidden */}
      {!isPinned && !isHeaderVisible && (
        <div 
          onMouseEnter={handleMouseEnterHeader}
          onClick={handleMouseEnterHeader}
          className="fixed top-1.5 left-1/2 -translate-x-1/2 z-[1001] cursor-pointer group flex items-center gap-2 bg-slate-950/85 hover:bg-[#0f172a]/95 border border-indigo-500/30 hover:border-indigo-400/60 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl px-3.5 py-1.5 rounded-full transition-all duration-300 hover:scale-105 select-none"
        >
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />
          <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">شريط الأدوات</span>
          <ChevronDown className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
        </div>
      )}

      <header 
        onMouseEnter={handleMouseEnterHeader}
        onMouseLeave={handleMouseLeaveHeader}
        style={{
          transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-140%)',
          opacity: isHeaderVisible ? 1 : 0,
          pointerEvents: isHeaderVisible ? 'auto' : 'none',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          backgroundColor: activeThemeConfig?.cardBg || 'rgba(8, 12, 24, 0.95)',
          borderColor: activeThemeConfig?.borderColor || 'rgba(255, 255, 255, 0.09)',
          boxShadow: `0 14px 40px rgba(0,0,0,0.75), 0 0 24px ${activeThemeConfig?.glowColor || 'rgba(99,102,241,0.16)'}`
        }}
        className="fixed top-2 left-2.5 sm:left-4 right-2.5 sm:right-4 backdrop-blur-2xl rounded-2xl z-[3500] px-2.5 sm:px-3.5 py-1.5 flex flex-col gap-1.5 border transition-all duration-300"
      >
        {/* === TIER 1: Brand, Instant Category Filter Tabs & Studio Control Deck === */}
        <div className="flex items-center justify-between w-full gap-2 min-h-[38px]">
          {/* Right Zone: Logo + Category Filter Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={props.onLogoClick} className="flex items-center gap-2 group shrink-0 text-start cursor-pointer">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/10 group-hover:scale-105 transition-all duration-300 relative overflow-hidden shrink-0 bg-white/[0.04] border border-white/[0.08]">
                 <img 
                   src={props.settings?.logoUrl || "/logo.png"} 
                   alt="SVGA AHMED Logo" 
                   className="w-full h-full object-contain relative z-10 drop-shadow-md p-0.5" 
                 />
              </div>
              <div className="flex flex-col items-start shrink-0">
                <h1 className="text-xs sm:text-sm font-black text-white tracking-tight whitespace-nowrap group-hover:text-amber-300 transition-colors leading-tight">
                  {props.settings?.appName?.trim() ? props.settings.appName : 'SVGA AHMED'}
                </h1>
                <span className="text-[8px] text-amber-400/90 font-bold tracking-wider uppercase whitespace-nowrap">Professional Studio</span>
              </div>
            </button>

            <div className="hidden md:block w-px h-5 bg-white/10 shrink-0" />

            {/* Instant Category Filter Tabs (تسهيل الوصول للأدوات حسب القسم بضغطة واحدة) */}
            <div className="hidden md:flex items-center gap-1 bg-[#050914]/80 border border-white/[0.06] rounded-xl p-0.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: `الكل (${topNavTools.length})` },
                { id: 'starred', label: 'المميزة ⭐' },
                { id: 'svga', label: 'أنيميشن و SVGA' },
                { id: 'image', label: 'الصور و AI' },
                { id: 'batch', label: 'الدفعات والميديا' },
              ].map((tab) => {
                const isActive = activeBarFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveBarFilter(tab.id as any);
                      if (scrollRef.current) {
                        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Zone: Studio Actions, Discovery, Preferences & Account Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Direct File Open Button */}
            <PWAAndroidActionButtons variant="header" onOpenFile={props.onOpenFile} />

            {/* Quick More Tools Dropdown */}
            <div className="relative shrink-0" ref={moreToolsMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreToolsOpen(prev => !prev)}
                className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isMoreToolsOpen
                    ? 'bg-indigo-600/30 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                    : 'bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-200 hover:text-white border-white/[0.08] hover:border-white/[0.18]'
                }`}
                title="قائمة الأدوات السريعة / More Tools"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="hidden sm:inline-block text-[11px] font-bold shrink-0">المزيد</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMoreToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMoreToolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 end-0 w-72 bg-[#0c1222]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[1100] flex flex-col gap-1 max-h-[460px] overflow-y-auto custom-scrollbar"
                    dir="rtl"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-black text-indigo-300 border-b border-white/10 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>كافة الأدوات ({topNavTools.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          toggleRibbonExpanded();
                          setIsMoreToolsOpen(false);
                        }}
                        className="text-[10px] text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                      >
                        {isRibbonExpanded ? 'طي الشريط' : 'فرد الشريط بالكامل'}
                      </button>
                    </div>
                    {topNavTools.map(tool => {
                      const isCurrent = props.currentTab === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            handleToolClick(tool);
                            setIsMoreToolsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-right ${
                            isCurrent
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            {React.cloneElement(tool.icon as React.ReactElement<any>, { className: 'w-4 h-4 shrink-0 text-indigo-400' })}
                            <span className="truncate">{tool.label}</span>
                          </span>
                          {(tool.isVip || props.settings?.vibFeatures?.includes(tool.id)) && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                              VIP 👑
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Studio Discovery & Preferences Capsule */}
            <div className="flex items-center gap-1 bg-[#050914]/80 border border-white/[0.07] rounded-xl p-0.5 shrink-0">
              {/* Mega Tools Grid Trigger Button */}
              <button
                onClick={() => setIsAllToolsOpen(true)}
                className="flex items-center justify-center gap-1 h-7 px-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 hover:text-white border border-indigo-500/30 rounded-lg transition-all font-bold text-xs shrink-0 active:scale-95 cursor-pointer whitespace-nowrap"
                title="استعراض كافة الأدوات في نافذة سريعة ومنظمة"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[10px] px-1 rounded bg-indigo-500/30 text-indigo-100 font-mono font-bold shrink-0">
                  {allTools.length}
                </span>
              </button>

              {/* Search Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center justify-center gap-1 h-7 px-2 bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] rounded-lg transition-all text-slate-300 hover:text-white group cursor-pointer shrink-0 whitespace-nowrap"
                title="بحث في كافة الأدوات (Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden xl:inline text-[10px] font-mono text-slate-400">⌘K</span>
              </button>

              {/* Smart Circle Button for Studio Dimensions, Zoom & Themes ("الدايرة الذكية") */}
              <button
                onClick={() => setIsThemeDimensionsModalOpen(true)}
                className="w-7 h-7 rounded-lg transition-all duration-300 border flex items-center justify-center shrink-0 cursor-pointer relative group shadow-sm hover:scale-105 active:scale-95"
                style={{
                  background: activeThemeConfig?.previewGradient || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.22)'
                }}
                title="تخصيص أبعاد ومقاسات وتصميم الموقع وراحة العين (الدايرة الذكية) 🎨📐"
              >
                <span className="text-xs select-none">{activeThemeConfig?.iconSymbol || '🎨'}</span>
                <span className="absolute -bottom-1 -start-1 text-[7px] font-black bg-black/85 px-1 rounded text-white font-mono">
                  {Math.round((zoomScale || 1) * 100)}%
                </span>
              </button>

              {/* Pin / Auto-hide Toggle Button */}
              <button
                onClick={togglePin}
                className={`w-7 h-7 rounded-lg transition-all duration-200 border flex items-center justify-center shrink-0 cursor-pointer ${
                  isPinned 
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/35' 
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border-transparent'
                }`}
                title={isPinned ? 'الشريط مثبت دائماً (انقر للتبديل إلى الإخفاء التلقائي)' : 'الشريط في وضع الإخفاء التلقائي (انقر لتثبيته دائماً)'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 text-indigo-400" /> : <PinOff className="w-3.5 h-3.5 opacity-70" />}
              </button>

              {/* Version Indicator Badge */}
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="hidden xl:flex items-center gap-1 h-7 px-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-all group shrink-0 cursor-pointer whitespace-nowrap"
                title="معلومات الإصدار وتحديثات النظام"
              >
                <span className="text-[10px] font-mono font-bold text-slate-300 group-hover:text-white dir-ltr shrink-0">
                  {CURRENT_APP_VERSION}
                </span>
              </button>

              {/* Language Switcher Dropdown */}
              <div className="relative shrink-0" ref={langMenuRef}>
                <button
                  onClick={() => setIsLangMenuOpen(prev => !prev)}
                  className={`h-7 px-2 rounded-lg transition-all duration-200 border flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                    isLangMenuOpen 
                      ? 'bg-indigo-600/25 text-white border-indigo-400/50' 
                      : 'text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06]'
                  }`}
                  title="تغيير لغة الموقع / Change Language"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase hidden xl:inline shrink-0">
                    {language}
                  </span>
                  <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform shrink-0 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 end-0 w-52 bg-[#0c1222]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[1100] flex flex-col gap-1 text-start"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-white/10 flex items-center justify-between">
                        <span>لغة الموقع / Language</span>
                        <span className="text-indigo-400 font-mono">7 Languages</span>
                      </div>
                      {SUPPORTED_LANGUAGES.map(item => {
                        const isSelected = language === item.code;
                        return (
                          <button
                            key={item.code}
                            onClick={() => {
                              setLanguage(item.code as any);
                              setIsLangMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40' 
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base leading-none">{item.flag}</span>
                              <span>{item.nativeName}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* VIB/VIP Section Independent Button */}
            <button 
              type="button"
              onClick={props.onVipClick}
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl border select-none shrink-0 transition-all duration-200 font-bold text-xs cursor-pointer ${
                (props.currentUser?.isVIP || props.currentUser?.role === 'admin' || props.currentUser?.isSuperAdmin)
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400 text-amber-200 hover:text-white'
              }`}
              title="باقة VIB الملكية - الميزات والاشتراك 👑"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">باقة VIB</span>
            </button>

            {/* Expiring Soon Alert Badge in Header */}
            {headerSubInfo?.isExpiringSoon && (
              <button
                onClick={props.onProfileClick}
                className="hidden sm:flex items-center gap-1 h-8 px-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer shrink-0 hover:bg-amber-500/30 transition-all"
                title={`تنبيه: اقترب انتهاء الاشتراك (${headerSubInfo.formattedRemaining}) - انقر للتجديد`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">{headerSubInfo.formattedRemaining}</span>
              </button>
            )}

            {/* Expired Warning Badge in Header */}
            {headerSubInfo?.isExpired && (
              <button
                onClick={props.onProfileClick}
                className="hidden sm:flex items-center gap-1 h-8 px-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black cursor-pointer shrink-0 hover:bg-rose-500/30 transition-all"
                title="الاشتراك منتهي - انقر للتجديد"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">الاشتراك منتهي</span>
              </button>
            )}

            {/* Account & Session Capsule */}
            <div className="flex items-center gap-1 bg-[#050914]/80 border border-white/[0.07] rounded-xl p-0.5 shrink-0">
              {!props.currentUser ? (
                <button
                  type="button"
                  onClick={props.onLoginClick}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-all shrink-0"
                  title="تسجيل الدخول أو إنشاء حساب جديد 🔐"
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>دخول</span>
                </button>
              ) : (
                <button
                  onClick={props.onProfileClick}
                  className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer group shrink-0 whitespace-nowrap"
                  title="الملف الشخصي وتفاصيل الاشتراك وتاريخ الانتهاء"
                >
                  {props.currentUser.photoURL ? (
                    <img 
                      src={props.currentUser.photoURL} 
                      alt={props.currentUser.name || 'حسابي'} 
                      className="w-5 h-5 rounded-md object-cover border border-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                      {(props.currentUser.name || props.currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="hidden xl:flex flex-col text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-200 group-hover:text-white max-w-[75px] truncate leading-tight whitespace-nowrap">
                      {props.currentUser.name || 'حسابي'}
                    </span>
                    <span className={`text-[8px] font-black leading-none whitespace-nowrap ${
                      headerSubInfo?.isExpired 
                        ? 'text-rose-400' 
                        : headerSubInfo?.isExpiringSoon 
                        ? 'text-amber-400' 
                        : headerSubInfo?.isActive 
                        ? 'text-emerald-400' 
                        : 'text-slate-400'
                    }`}>
                      {headerSubInfo?.statusLabelAr || 'عضو'}
                    </span>
                  </div>
                </button>
              )}

              {props.isAdmin && (
                <button
                  onClick={props.onAdminToggle}
                  className={`w-7 h-7 rounded-lg transition-all duration-200 border flex items-center justify-center shrink-0 cursor-pointer ${
                    props.isAdminOpen 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.08] border-transparent'
                  }`}
                  title="لوحة الإدارة / Admin Panel"
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}

              <button
                onClick={props.onLogout}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/25 transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            {/* Mobile Menu Trigger */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-8 h-8 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="القائمة"
            >
              <Menu className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* === TIER 2: Full-Width Dedicated Studio Tools Ribbon (100% Width for Easy Left/Right Movement) === */}
        <div className="flex items-center w-full min-w-0 bg-[#050914]/85 border border-white/[0.07] rounded-xl p-1 gap-1.5 shadow-inner">
          {/* Scroll Right Button (تحريك الشريط لليمين بسهولة) */}
          {!isRibbonExpanded && (
            <button
              type="button"
              id="nav-scroll-right-btn"
              onClick={() => handleNavScroll('right')}
              onMouseDown={() => startContinuousScroll('right')}
              onMouseUp={stopContinuousScroll}
              onMouseLeave={stopContinuousScroll}
              className="w-8 h-8 rounded-lg bg-slate-900/95 hover:bg-indigo-600 text-slate-200 hover:text-white border border-white/10 hover:border-indigo-400/60 shadow-sm transition-all shrink-0 flex items-center justify-center active:scale-95 cursor-pointer group"
              title="تحريك شريط الأدوات لليمين (اضغط مطولاً للتمرير السريع)"
              aria-label="تحريك شريط الأدوات لليمين"
            >
              <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          {/* Inline Tools <nav> (Never unmounts on state changes, preserving scroll position!) */}
          <nav 
            ref={scrollRef} 
            onWheel={handleNavWheel}
            onMouseDown={handleNavMouseDown}
            onMouseMove={handleNavMouseMove}
            onMouseUp={handleNavMouseUp}
            onMouseLeave={handleNavMouseUp}
            className={`flex items-center gap-1.5 text-xs font-bold flex-1 min-w-0 px-1 select-none ${
              isRibbonExpanded
                ? 'flex-wrap overflow-y-auto max-h-[160px] py-1 custom-scrollbar'
                : `overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth ${
                    isNavDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`
            }`} 
          >
            <div className={`flex items-center gap-1.5 ${isRibbonExpanded ? 'flex-wrap w-full' : 'shrink-0'}`}>
              {filteredRibbonStarredTools.map((tool) => renderNavToolButton(tool, true))}
              {filteredRibbonStarredTools.length > 0 && filteredRibbonUnstarredTools.length > 0 && !isRibbonExpanded && (
                <div className="w-px h-5 bg-white/15 shrink-0 mx-0.5" />
              )}
              {filteredRibbonUnstarredTools.map((tool) => renderNavToolButton(tool, isStarred(tool.id)))}
            </div>
          </nav>

          {/* Scroll Left Button (تحريك الشريط لليسار بسهولة) */}
          {!isRibbonExpanded && (
            <button
              type="button"
              id="nav-scroll-left-btn"
              onClick={() => handleNavScroll('left')}
              onMouseDown={() => startContinuousScroll('left')}
              onMouseUp={stopContinuousScroll}
              onMouseLeave={stopContinuousScroll}
              className="w-8 h-8 rounded-lg bg-slate-900/95 hover:bg-indigo-600 text-slate-200 hover:text-white border border-white/10 hover:border-indigo-400/60 shadow-sm transition-all shrink-0 flex items-center justify-center active:scale-95 cursor-pointer group"
              title="تحريك شريط الأدوات لليسار (اضغط مطولاً للتمرير السريع)"
              aria-label="تحريك شريط الأدوات لليسار"
            >
              <ChevronLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            </button>
          )}

          {/* Expand / Collapse All Tools Ribbon Toggle (فرد كل الأزرار بدون تمرير) */}
          <button
            type="button"
            id="nav-expand-all-btn"
            onClick={toggleRibbonExpanded}
            className={`h-8 px-2.5 rounded-lg border flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              isRibbonExpanded
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                : 'bg-slate-900/95 hover:bg-indigo-600/30 text-indigo-200 hover:text-white border-indigo-500/30'
            }`}
            title={isRibbonExpanded ? 'طي الشريط في سطر واحد' : 'فرد وعرض جميع الأزرار أمامك بدون تحريك يمين أو يسار'}
          >
            {isRibbonExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-white shrink-0" />
                <span>طي الشريط</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>فرد الكل</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* --- Search Command Palette (Modal) --- */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-20 px-4 sm:pt-32">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-slate-950/90 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <Search className="w-6 h-6 text-indigo-400 ml-2" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن أداة أو وظيفة..."
                  className="flex-1 bg-transparent border-none text-xl text-white outline-none placeholder:text-slate-600 font-bold"
                  dir="rtl"
                />
                <button onClick={() => setIsSearchOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
                {searchQuery.trim() === '' ? (
                  <div className="py-4 space-y-4">
                    {starredNavTools.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>الأدوات المثبتة بنجمة في البداية ({starredNavTools.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {starredNavTools.map(tool => (
                            <button
                              key={tool.id}
                              onClick={() => handleToolClick(tool)}
                              className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all text-right group"
                            >
                              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
                                {tool.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-white group-hover:text-amber-300 truncate">{tool.label}</p>
                                <p className="text-[10px] text-amber-400/80 truncate">{tool.categoryNameAr}</p>
                              </div>
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-center py-6 text-slate-500">
                      <Command className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="font-bold text-sm">ابدأ بكتابة اسم الأداة أو الوظيفة للبحث</p>
                    </div>
                  </div>
                ) : filteredTools.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <p className="font-bold text-lg">لم يتم العثور على نتائج لـ "{searchQuery}"</p>
                    <p className="text-sm mt-2 opacity-70">جرب كلمات مفتاحية أخرى (مثل: قص، دمج، تعديل)</p>
                  </div>
                ) : (
                  filteredTools.map(tool => {
                    const starred = isStarred(tool.id);
                    return (
                      <div
                        key={tool.id}
                        className="flex items-center gap-2 p-2 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group w-full"
                      >
                        <button
                          onClick={() => handleToolClick(tool)}
                          className="flex items-center gap-4 flex-1 text-right p-2 cursor-pointer"
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-110 transition-transform ${
                            starred
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {tool.icon}
                          </div>
                          <div className="flex-1 flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-lg text-slate-200 group-hover:text-indigo-300 transition-colors">{tool.label}</span>
                              {starred && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span>مثبتة</span>
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-1">{tool.descAr}</span>
                          </div>
                        </button>

                        {/* Star Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(tool, e)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                            starred
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                              : 'bg-white/5 border-white/10 text-slate-500 hover:text-amber-400 hover:bg-white/10'
                          }`}
                          title={starred ? 'أداة مثبتة بنجمة في البداية (انقر لإلغاء التثبيت)' : 'تثبيت الأداة بنجمة في البداية'}
                        >
                          <Star className={`w-4 h-4 ${starred ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Tool Info Popup (Tooltip / Modal) --- */}
      <AnimatePresence>
        {infoModalTool && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setInfoModalTool(null)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden p-1 box-border"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none"></div>
              
              <div className="bg-[#020617] rounded-[1.8rem] p-8 relative z-10 w-full h-full flex flex-col gap-6">
                 {/* Close Button */}
                 <button onClick={() => setInfoModalTool(null)} className="absolute top-6 left-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                    <CloseIcon className="w-5 h-5" />
                 </button>

                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                      {React.cloneElement(infoModalTool.icon as React.ReactElement<any>, { className: 'w-8 h-8' })}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-2xl font-black text-white">{infoModalTool.label}</h3>
                      {infoModalTool.highlight && <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block w-fit">وظيفة متقدمة ⚡</span>}
                    </div>
                 </div>

                 <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                 <div className="flex flex-col gap-5 text-right">
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-left font-sans">Description (AR)</h4>
                       <p className="text-sm text-slate-300 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/5">{infoModalTool.descAr}</p>
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-left font-sans">Description (EN)</h4>
                       <p className="text-sm text-slate-400 leading-relaxed font-medium font-sans bg-slate-900/50 p-4 rounded-2xl border border-white/5" dir="ltr">{infoModalTool.descEn}</p>
                    </div>
                 </div>

                 <div className="pt-4 flex items-center justify-between mt-auto">
                    <button onClick={() => setInfoModalTool(null)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors">إغلاق</button>
                    <button 
                      onClick={() => { handleToolClick(infoModalTool); setInfoModalTool(null); }} 
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      بدء استخدام الأداة <ChevronDown className="w-4 h-4 rotate-90" />
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Mobile Full Screen Menu --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[1001] lg:hidden flex flex-col">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#020617]/95 backdrop-blur-3xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="relative z-10 flex flex-col h-full bg-[#020617] overflow-y-auto"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-20">
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white">
                  <CloseIcon className="w-6 h-6" />
                </button>
                <span className="font-black text-xl text-white">الأدوات والتطبيقات</span>
                <div className="w-10"></div>
              </div>

              <div className="p-4 flex flex-col gap-6 pt-6">
                {/* Featured Prominent Banner for After Effects Studio in Mobile */}
                {props.onAfterEffectsStudioOpen && (
                  <button
                    onClick={() => {
                      props.onAfterEffectsStudioOpen?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-600/35 via-rose-600/30 to-red-700/35 border-2 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.5)] text-right group active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                      <Film className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-red-100 group-hover:text-white">استوديو After Effects</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white shadow-sm border border-red-300">PRO 🎬</span>
                      </div>
                      <span className="text-xs text-red-200/80 font-medium">الكومبوزيشن والتايم لاين ومفاتيح الحركة وتصدير SVGA وAPNG</span>
                    </div>
                  </button>
                )}

                {visibleCategories.map((category) => (
                  <div key={category.id} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-2 text-indigo-400">
                      {category.icon}
                      <h3 className="font-black text-lg">{category.label}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {category.tools.map(tool => {
                         const isActive = props.currentTab === tool.id;
                         return (
                           <div key={tool.id} className="relative group">
                             <button
                               onClick={() => handleToolClick(tool)}
                               className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                                 isActive 
                                   ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                   : 'bg-white/5 text-slate-300 border border-white/5 active:bg-white/10'
                               }`}
                             >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-[#020617]/50'}`}>
                                  {React.cloneElement(tool.icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
                                </div>
                                <div className="flex-1 flex flex-col items-start gap-1 text-right">
                                  <span className="font-black text-lg">{tool.label}</span>
                                  <span className="text-[10px] text-slate-400 opacity-80">{tool.descAr}</span>
                                </div>
                             </button>
                             {/* Mobile Info Button */}
                             <button 
                               onClick={(e) => { e.stopPropagation(); setInfoModalTool(tool); }}
                               className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full text-slate-300"
                             >
                               <Info className="w-4 h-4" />
                             </button>
                           </div>
                         )
                       })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mega All Tools Grid Modal */}
      <AnimatePresence>
        {isAllToolsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAllToolsOpen(false)}
              className="absolute inset-0 bg-[#020617]/85 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-5xl max-h-[88vh] bg-[#070B18]/95 border border-indigo-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col backdrop-blur-2xl"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0a0f24]/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                      <span>دليل واستعراض الأدوات الشامل</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                        {allTools.length} أداة
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      كافة الأدوات والتطبيقات المتاحة في المنصة منظمة في مكان واحد للوصول السريع
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAllToolsOpen(false)}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Search & Filter Bar */}
              <div className="p-4 sm:p-5 border-b border-white/5 bg-[#050814]/80 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={allToolsSearch}
                    onChange={(e) => setAllToolsSearch(e.target.value)}
                    placeholder="ابحث عن أي أداة بالاسم أو الوظيفة..."
                    className="w-full pl-4 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all font-medium"
                  />
                  {allToolsSearch && (
                    <button
                      onClick={() => setAllToolsSearch('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Categories Tab Selector inside Modal */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    الكل ({allTools.length})
                  </button>

                  {/* Starred Category Tab */}
                  <button
                    onClick={() => setSelectedCategory('starred')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      selectedCategory === 'starred'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                        : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>المثبتة في البداية ({starredNavTools.length})</span>
                  </button>

                  {visibleCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{cat.label.split(' ')[0]}</span>
                      <span className="text-[10px] opacity-70">({cat.tools.length})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools Cards Grid */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                {selectedCategory === 'starred' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
                      <div className="flex items-center gap-2 text-sm font-black text-amber-400">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span>الأدوات المثبتة بنجمة في البداية</span>
                        <span className="text-xs text-amber-400/70 font-normal">({starredNavTools.length} أداة مثبتة)</span>
                      </div>
                      <span className="text-xs text-slate-400 hidden sm:inline">تظهر هذه الأدوات دائماً في بداية شريط التنقل دون أن تتحرك</span>
                    </div>

                    {starredNavTools.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Star className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
                        <p className="font-bold text-base text-slate-300">لم تقم بتثبيت أي أداة بنجمة بعد</p>
                        <p className="text-xs text-slate-500 mt-1">اضغط على أيقونة النجمة بجانب أي أداة لتثبيتها في البداية للوصول السريع</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {starredNavTools
                          .filter(t => 
                            !allToolsSearch.trim() || 
                            t.label.toLowerCase().includes(allToolsSearch.toLowerCase()) || 
                            t.descAr.toLowerCase().includes(allToolsSearch.toLowerCase())
                          )
                          .map(tool => {
                            const isActive = props.currentTab === tool.id;
                            return (
                              <div
                                key={tool.id}
                                className={`text-right p-4 rounded-3xl border transition-all duration-300 flex flex-col gap-3 group hover:-translate-y-1 relative backdrop-blur-xl ${
                                  isActive
                                    ? 'bg-gradient-to-br from-amber-500/30 to-purple-600/30 border-amber-400 shadow-[0_10px_35px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50'
                                    : 'bg-gradient-to-br from-amber-950/25 to-slate-950/90 hover:from-amber-950/45 border-amber-500/35 hover:border-amber-400 shadow-md shadow-amber-950/20'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-inner group-hover:scale-105 transition-transform">
                                      {React.cloneElement(tool.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition-colors">
                                          {tool.label}
                                        </h4>
                                        {tool.isVip && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black">
                                            {tool.vipBadge || 'VIP 👑'}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-amber-400/80 font-mono mt-0.5 block">
                                        {tool.categoryNameAr}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleStar(tool, e)}
                                    className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                                    title="أداة مثبتة بنجمة في البداية (اضغط لإلغاء التثبيت)"
                                  >
                                    <Star className="w-4 h-4 fill-amber-400" />
                                  </button>
                                </div>

                                <p className="text-xs text-slate-300/90 leading-relaxed line-clamp-2 font-normal">
                                  {tool.descAr}
                                </p>

                                <button
                                  onClick={() => handleToolClick(tool)}
                                  className="w-full mt-auto py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                                >
                                  <span>تشغيل الأداة مباشرة</span>
                                  {isActive && <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded-md font-bold text-white">نشطة</span>}
                                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : (
                  (selectedCategory === 'all' ? visibleCategories : visibleCategories.filter(c => c.id === selectedCategory)).map(category => {
                    const categoryTools = category.tools.filter(t => 
                      !allToolsSearch.trim() || 
                      t.label.toLowerCase().includes(allToolsSearch.toLowerCase()) || 
                      t.descAr.toLowerCase().includes(allToolsSearch.toLowerCase()) || 
                      t.descEn.toLowerCase().includes(allToolsSearch.toLowerCase())
                    );

                    if (categoryTools.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-black text-indigo-300 pb-1 border-b border-white/5">
                          {category.icon}
                          <span>{category.label}</span>
                          <span className="text-xs text-slate-500 font-normal">({categoryTools.length} أداة)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryTools.map(tool => {
                            const isActive = props.currentTab === tool.id;
                            const starred = isStarred(tool.id);
                            return (
                                <div
                                key={tool.id}
                                className={`text-right p-4 rounded-3xl border transition-all duration-300 flex flex-col gap-3 group hover:-translate-y-1 relative backdrop-blur-xl ${
                                  isActive
                                    ? 'bg-gradient-to-br from-indigo-900/60 via-purple-950/60 to-slate-950/90 border-indigo-400 shadow-[0_10px_35px_rgba(99,102,241,0.35)] ring-1 ring-indigo-400/50'
                                    : starred
                                      ? 'bg-gradient-to-br from-amber-950/30 to-slate-950/80 hover:from-amber-950/50 border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-950/20'
                                      : tool.highlight
                                        ? 'bg-gradient-to-br from-[#0c142c]/90 via-[#0d1734]/80 to-[#070b18]/95 hover:from-[#111c40] border-indigo-500/30 hover:border-indigo-400/70 shadow-lg shadow-indigo-950/30'
                                        : 'bg-[#090e1e]/80 hover:bg-[#0e1630] border-white/10 hover:border-white/25 shadow-md'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-2xl transition-transform group-hover:scale-105 ${
                                      starred
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-inner'
                                        : isActive || tool.highlight 
                                          ? 'bg-indigo-500/25 text-cyan-300 border border-indigo-500/40 shadow-inner shadow-indigo-500/20' 
                                          : 'bg-white/5 text-slate-300 border border-white/10'
                                    }`}>
                                      {React.cloneElement(tool.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-black text-sm text-white group-hover:text-cyan-300 transition-colors">
                                          {tool.label}
                                        </h4>
                                        {tool.isVip && (
                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black tracking-wider">
                                            {tool.vipBadge || 'VIP 👑'}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                        {tool.categoryNameAr}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {isActive && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-black shadow-sm">
                                        نشط الآن
                                      </span>
                                    )}

                                    {/* Star Toggle Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleStar(tool, e)}
                                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                        starred
                                          ? 'bg-amber-500/25 border-amber-500/50 text-amber-400 shadow-sm'
                                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30'
                                      }`}
                                      title={starred ? 'أداة مثبتة بنجمة في البداية (اضغط لإلغاء التثبيت)' : 'تثبيت الأداة بنجمة في البداية'}
                                    >
                                      <Star className={`w-3.5 h-3.5 ${starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-300/90 leading-relaxed line-clamp-2 font-normal">
                                  {tool.descAr}
                                </p>

                                <button
                                  onClick={() => handleToolClick(tool)}
                                  className={`w-full mt-auto py-2.5 px-3 rounded-2xl text-xs font-black transition-all text-center cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                                    isActive
                                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                                      : 'bg-white/5 hover:bg-indigo-600 text-slate-200 hover:text-white border border-white/10 hover:border-indigo-400 shadow-sm'
                                  }`}
                                >
                                  <span>تشغيل الأداة مباشرة</span>
                                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Version & Build Information Modal */}
      <VersionInfoModal 
        isOpen={isVersionModalOpen} 
        onClose={() => setIsVersionModalOpen(false)} 
      />

    </>
  );
};
