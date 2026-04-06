import React from 'react';
import * as LucideIcons from 'lucide-react';

// Standard ESM Imports for Icon Providers
import * as SolarIcons from '@solar-icons/react';
import * as PhosphorIcons from '@phosphor-icons/react';
import * as RemixIcons from '@remixicon/react';

import { settingsService } from '../../services/settingsService';
import { getThemeColors } from '../../config/themeColors';

export type IconProvider = 'solar' | 'phosphor' | 'remix' | 'lucide' | 'auto';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  provider?: IconProvider;
  size?: number;
  color?: string; // Overrides theme color
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; // Phosphor style
  variant?: 'Bold' | 'Linear' | 'Outline' | 'BoldDuotone' | 'LineDuotone' | 'Broken'; // Solar style
  className?: string;
}

/**
 * Universal Icon Mapping (Lucide Name -> Modern Name)
 * Key is the requested name, value is the preferred modern alternative.
 */
const ALIAS_MAP: Record<string, string> = {
  // Navigation & Search
  'Search': 'Magnifer',
  'Magnifier': 'Magnifer',
  'Magnifer': 'Search',
  'Menu': 'HamburgerMenu',
  'HamburgerMenu': 'Menu',
  'Home': 'Home2',
  'Home2': 'Home',
  'Globe': 'Global',
  'Global': 'Globe',
  'Globus': 'Global',

  // Security & System
  'Shield': 'ShieldCheck',
  'ShieldCheck': 'Shield',
  'ShieldAlert': 'Danger',
  'Danger': 'AlertTriangle',
  'AlertTriangle': 'Danger',
  'Lock': 'Lock',
  'Unlock': 'Unlock',
  'Key': 'Key',
  'Fingerprint': 'Scanner',
  'Scanner': 'Fingerprint',
  'Cpu': 'Cpu',
  'Zap': 'Bolt',
  'Flash': 'Bolt',
  'Energy': 'Bolt',
  'Bolt': 'Zap',
  'Activity': 'Activity',

  // Actions & UI
  'Check': 'CheckCircle',
  'CheckCircle': 'Check',
  'CheckCircle2': 'CheckCircle',
  'X': 'CloseCircle',
  'XCircle': 'CloseCircle',
  'CloseCircle': 'XCircle',
  'Close': 'CloseCircle',
  'Plus': 'AddCircle',
  'AddCircle': 'Plus',
  'Minus': 'MinusCircle',
  'MinusCircle': 'Minus',
  'Info': 'InfoCircle',
  'InfoCircle': 'Info',
  'HelpCircle': 'QuestionCircle',
  'QuestionCircle': 'HelpCircle',
  'Settings': 'Settings',
  'Terminal': 'Terminal',
  'Document': 'FileText',
  'FileText': 'Document',
  'Code2': 'Code',
  'Command': 'Code',
  'Code': 'Command',
  'Table': 'TableView',
  'TableView': 'Table',
  'Keyboard': 'Keyboard',
  'HardDrive': 'Disk',
  'Disk': 'HardDrive',

  // Communication
  'Mail': 'Letter',
  'Letter': 'Mail',
  'Send': 'Send',
  'Share': 'Share',
  'Share2': 'Share',
  'Bell': 'BellBinning',
  'BellBinning': 'Bell',
  'BellRing': 'BellBinning',

  // Files & Folders
  'File': 'File',
  'Folder': 'Folder',
  'FolderOpen': 'Folder',
  'Download': 'Download',
  'Upload': 'Upload',
  'Save': 'Diskette',

  // Media & Interaction
  'Play': 'Play',
  'Pause': 'Pause',
  'Stop': 'StopCircle',
  'StopCircle': 'Stop',
  'Volume2': 'VolumeHigh',
  'VolumeHigh': 'Volume2',
  'VolumeX': 'VolumeCross',
  'VolumeCross': 'VolumeX',
  'Eye': 'Eye',
  'EyeOff': 'EyeClosed',
  'EyeClosed': 'EyeOff',
  'Aperture': 'Aperture',
  'Camera': 'Camera',
  'Stars': 'Sparkles',
  'Sparkles': 'Stars',
  'Target': 'Target',
  'Microphone': 'Microphone',
  'Mic': 'Microphone',
  'User': 'User',
  'Monitor': 'Monitor',
  'Wifi': 'WifiHigh',
  'Database': 'Database',
  'Layers': 'Layers',
  'Server': 'Server',
  'Radio': 'Radio',
  'Crosshair': 'Target',
  'Youtube': 'VideoLibrary',
  'ExternalLink': 'SquareArrowUpRight',
  'Newspaper': 'Notes',
  'SkipForward': 'SkipNext',
  'SkipBack': 'SkipPrevious',
  'Maximize': 'Maximize',
  'Smartphone': 'Smartphone',
  'Tablet': 'Tablet',
  'WifiOff': 'WifiFixed',
  'Battery': 'BatteryFull',
  'BatteryLow': 'BatteryLow',
  'BatteryMedium': 'BatteryMedium',
  'BatteryFull': 'BatteryFull',
  'Signal': 'Signal',
  'SignalLow': 'Signal',
  'SignalMedium': 'Signal',
  'SignalHigh': 'Signal',
  'RefreshCw': 'Refresh',
  'Video': 'VideoLibrary',
  'ClockCircle': 'Clock',
  'Clock': 'ClockCircle',
  'Loader': 'Restart',
  'AlertCircle': 'DangerCircle',
  'Network': 'Routing',
  'Navigation': 'Compass',
  'Power': 'Power',
  'Languages': 'Translation',
  'Trash': 'TrashBinMinimalistic',
  'Trash2': 'TrashBinMinimalistic2',
  'Calendar': 'Calendar',
  'BarChart': 'Chart',
  'PieChart': 'PieChart',
  'KeySquare': 'Key',
  'Brain': 'Brain',
  'List': 'List',
  'Settings2': 'Settings',
  'Link': 'Link',
  'Wallet': 'Wallet',
  'TrendingDown': 'GraphDown',
  'TrendingUp': 'GraphUp',
  'Trophy': 'Cup',
  'Users': 'UsersGroupTwoRounded',
  'Flame': 'Fire',
  'Crown': 'Crown',
  'BarChart2': 'ChartSquare',
  'Swords': 'Sword2',
  'QrCode': 'QrCode',
  'Scan': 'Scan',
  'Bug': 'Bug',
  'Skull': 'Skull',
  'Chrome': 'Global',
  'Maximize2': 'Maximize',
  'Minimize2': 'Minimize',
  'Loader2': 'Restart',
  'MessageSquare': 'Chat',
  'ChevronRight': 'AltArrowRight',
  'ChevronLeft': 'AltArrowLeft',
  'ChevronUp': 'AltArrowUp',
  'ChevronDown': 'AltArrowDown',
  'BrainCircuit': 'Brain',
  'Minimize': 'Minimize',
  'ArrowLeft': 'ArrowLeft',
  'ArrowRight': 'ArrowRight',
  'Book': 'Book',
  'FileCode': 'CodeFile',
  'BookOpen': 'Book',
  'Square': 'StopCircle',
  'Circle': 'Circle',
};

/**
 * Kernel-Grade Icon Engine for LUCA OS
 * Tiered resolution: User Defined -> Solar -> Phosphor -> Remix -> Lucide Fallback
 */
export const Icon: React.FC<IconProps> = ({ 
  name, 
  provider = 'auto',
  size = 18, 
  color, 
  weight = 'regular', 
  variant = 'LineDuotone',
  className = '',
  ...props 
}) => {
  // Get active theme for context-aware coloring
  const settings = settingsService.get('general');
  const theme = getThemeColors(settings?.theme || 'PROFESSIONAL');
  
  // Default icon color if not specified
  const iconColor = color || theme.hex || 'currentColor';
  
  // Secondary color for Duotone (30% opacity of primary)
  const secondaryColor = iconColor.startsWith('#') 
    ? `${iconColor.slice(0, 7)}4d` // Adding 4d (approx 30%)
    : iconColor;

  // Helper to resolve component from a provider
  const getIconComponent = (providerKey: IconProvider, iconName: string): any => {
    switch(providerKey) {
      case 'solar': return (SolarIcons as any)[iconName];
      case 'phosphor': return (PhosphorIcons as any)[iconName];
      case 'remix': return (RemixIcons as any)[iconName];
      case 'lucide': return (LucideIcons as any)[iconName];
      default: return null;
    }
  };

  // Resolution Tiers
  const tiers: IconProvider[] = ['solar', 'phosphor', 'remix', 'lucide'];

  // Try the requested name first, then the aliased name
  const namesToTry = [name, ALIAS_MAP[name]].filter(Boolean) as string[];

  // Attempt resolution
  for (const n of namesToTry) {
    if (provider !== 'auto') {
      const Comp = getIconComponent(provider, n);
      if (Comp) return renderIcon(provider, Comp);
      continue;
    }

    for (const tier of tiers) {
      const Comp = getIconComponent(tier, n);
      if (Comp) return renderIcon(tier, Comp);
    }
  }

  function renderIcon(p: IconProvider, Comp: any) {
    switch(p) {
      case 'solar':
        return <Comp size={size} color={iconColor} variant={variant} className={className} secondaryColor={secondaryColor} {...props} />;
      case 'phosphor':
        return <Comp size={size} color={iconColor} weight={weight === 'duotone' ? 'duotone' : weight} className={className} {...props} />;
      case 'remix':
      case 'lucide':
        return <Comp size={size} color={iconColor} className={className} {...props} />;
    }
    return null;
  }

  // Final rendering: Nothing found
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Icon Engine] Icon "${name}" (aliased: ${ALIAS_MAP[name]}) not found in any provider.`);
  }
  
  // Return a generic fallback if absolutely nothing found (prevents app crash)
  const Fallback = (LucideIcons as any).HelpCircle || (LucideIcons as any).AlertCircle;
  return Fallback ? <Fallback size={size} color={iconColor} className={className} /> : null;
};
