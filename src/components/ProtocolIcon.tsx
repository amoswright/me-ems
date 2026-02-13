import {
  Baby,
  Building2,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Frown,
  Heart,
  Syringe,
  Stethoscope,
  Hospital,
  FileText,
  Clock,
  AlertCircle,
  Thermometer,
  Wind,
  Droplet,
  Pill,
  Activity,
  Zap,
  Users,
  UserCheck,
  Ban,
  Ambulance,
  CalendarDays,
  Edit,
  CircleHelp,
  Sparkles,
  Bandage,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

interface ProtocolIconProps {
  name: string;
  className?: string;
}

// Map img tag descriptions to lucide icons
const ICON_MAP: Record<string, { icon: LucideIcon; color?: string }> = {
  // Pediatric/Bear icons - use Baby icon with different colors
  'Bear': { icon: Baby, color: 'text-blue-500' },
  'Bear with stethoscope': { icon: Baby, color: 'text-blue-600' },
  'Bear with bandage': { icon: Baby, color: 'text-blue-400' },
  'Bear with syringe': { icon: Baby, color: 'text-blue-500' },
  'Bear icon': { icon: Baby, color: 'text-blue-500' },
  'Bear Icon': { icon: Baby, color: 'text-blue-500' },
  'Teddy bear': { icon: Baby, color: 'text-blue-500' },
  'Teddy bear icon': { icon: Baby, color: 'text-blue-500' },
  'A teddy bear.': { icon: Baby, color: 'text-blue-500' },
  'A small teddy bear illustration.': { icon: Baby, color: 'text-blue-500' },
  'A teddy bear wearing a stethoscope.': { icon: Baby, color: 'text-blue-600' },
  'A teddy bear wearing a bandage.': { icon: Baby, color: 'text-blue-400' },
  'A teddy bear holding a syringe.': { icon: Baby, color: 'text-blue-500' },
  'A teddy bear icon.': { icon: Baby, color: 'text-blue-500' },
  'A small teddy bear icon.': { icon: Baby, color: 'text-blue-500' },
  'A small blue teddy bear.': { icon: Baby, color: 'text-blue-500' },
  'A small blue teddy bear with a bandage on its head.': { icon: Baby, color: 'text-blue-400' },
  'A small blue teddy bear icon.': { icon: Baby, color: 'text-blue-500' },
  'A blue teddy bear with a bandage on its head.': { icon: Baby, color: 'text-blue-400' },
  'A blue teddy bear sitting up.': { icon: Baby, color: 'text-blue-500' },
  'A cartoon teddy bear.': { icon: Baby, color: 'text-blue-500' },

  // Hospital/Medical facility
  'Hospital Logo': { icon: Hospital, color: 'text-red-600' },
  'Hospital Icon': { icon: Hospital, color: 'text-red-600' },
  'Hospital icon': { icon: Hospital, color: 'text-red-600' },
  'Hospital building icon': { icon: Building2, color: 'text-gray-600 dark:text-gray-400' },
  'Hospital': { icon: Hospital, color: 'text-red-600' },
  'Hospital logo.': { icon: Hospital, color: 'text-red-600' },
  'Hospital bed icon': { icon: Hospital, color: 'text-red-600' },

  // Phone/Contact
  'Phone icon': { icon: Phone, color: 'text-green-600' },
  'Hand Holding Phone Icon': { icon: Phone, color: 'text-green-600' },
  'A hand holding a phone.': { icon: Phone, color: 'text-green-600' },
  'Smartphone icon': { icon: Phone, color: 'text-green-600' },
  'Phone': { icon: Phone, color: 'text-green-600' },
  'Phone keypad': { icon: Phone, color: 'text-green-600' },

  // Yes/No
  'Touch for YES icon (thumbs up)': { icon: ThumbsUp, color: 'text-green-600' },
  'Touch for NO icon (thumbs down)': { icon: ThumbsDown, color: 'text-red-600' },

  // Emotions/Symptoms
  'Worried face icon': { icon: Frown, color: 'text-orange-500' },
  'Sad face icon': { icon: Frown, color: 'text-blue-500' },
  'Frustrated face icon': { icon: Frown, color: 'text-red-500' },
  'Frustrated person icon': { icon: Frown, color: 'text-red-500' },
  'Angry face icon': { icon: Frown, color: 'text-red-600' },
  'Confused icon': { icon: CircleHelp, color: 'text-purple-500' },

  // Medical symptoms
  'Headache icon': { icon: AlertCircle, color: 'text-red-500' },
  'Dizzy icon': { icon: AlertCircle, color: 'text-purple-500' },
  'Nauseous icon': { icon: Frown, color: 'text-green-600' },
  'Fever icon': { icon: Thermometer, color: 'text-red-500' },
  'Chest Pain icon': { icon: Heart, color: 'text-red-600' },
  'Shortness of Breath icon': { icon: Wind, color: 'text-blue-500' },
  "Can't Breathe icon": { icon: Wind, color: 'text-red-600' },
  'Choking icon': { icon: AlertCircle, color: 'text-red-600' },
  'Cough icon': { icon: Wind, color: 'text-blue-500' },
  'Sore Throat icon': { icon: AlertCircle, color: 'text-orange-500' },
  'Cold icon': { icon: Thermometer, color: 'text-blue-400' },
  'Burns icon': { icon: Zap, color: 'text-orange-600' },
  'Numbness icon': { icon: Ban, color: 'text-gray-500' },
  'Allergy icon': { icon: AlertCircle, color: 'text-red-500' },
  'Anxiety Depression icon': { icon: Frown, color: 'text-purple-500' },

  // Medical equipment
  'Needle icon': { icon: Syringe, color: 'text-gray-600 dark:text-gray-400' },
  'Medicine bottle icon': { icon: Pill, color: 'text-blue-500' },
  'Oxygen tank icon': { icon: Wind, color: 'text-blue-500' },
  'Stethoscope': { icon: Stethoscope, color: 'text-gray-600 dark:text-gray-400' },
  'Bandage': { icon: Bandage, color: 'text-orange-400' },

  // Other medical
  'Doctor icon': { icon: UserCheck, color: 'text-blue-600' },
  'Family icon': { icon: Users, color: 'text-purple-500' },
  'Hearing Aid icon': { icon: Activity, color: 'text-gray-600 dark:text-gray-400' },
  'Assistive Listening Device icon': { icon: Activity, color: 'text-gray-600 dark:text-gray-400' },

  // Documents/Info
  'Paper with pen icon': { icon: FileText, color: 'text-gray-600 dark:text-gray-400' },
  'Will/DNR icon': { icon: FileText, color: 'text-red-600' },
  'What happened icon': { icon: CircleHelp, color: 'text-blue-500' },
  'Edit': { icon: Edit, color: 'text-gray-600 dark:text-gray-400' },

  // Time/Calendar
  'Clock icon': { icon: Clock, color: 'text-gray-600 dark:text-gray-400' },
  'Calendar icon': { icon: CalendarDays, color: 'text-gray-600 dark:text-gray-400' },

  // Emergency vehicles
  'Ambulance': { icon: Ambulance, color: 'text-red-600' },
  'Fire Truck': { icon: Ambulance, color: 'text-red-600' },
  'Police Car': { icon: Ambulance, color: 'text-blue-600' },

  // Misc
  'Water bottle icon': { icon: Droplet, color: 'text-blue-400' },
  'Blanket icon': { icon: Sparkles, color: 'text-blue-300' },
  'Flashlight with light on': { icon: Zap, color: 'text-yellow-500' },
  'Flashlight pointing up': { icon: TrendingUp, color: 'text-yellow-500' },
  'Flashlight pointing down': { icon: TrendingUp, color: 'text-yellow-500' },
  'Flashlight pointing left': { icon: TrendingUp, color: 'text-yellow-500' },
  'Flashlight pointing right': { icon: TrendingUp, color: 'text-yellow-500' },
  'Handshake Icon': { icon: Users, color: 'text-purple-500' },
  'Suicidal skull icon': { icon: AlertCircle, color: 'text-red-700' },
  'Restroom icon': { icon: Ban, color: 'text-gray-500' },
};

export function ProtocolIcon({ name, className = '' }: ProtocolIconProps) {
  const iconConfig = ICON_MAP[name];

  // If no icon mapping found, return a generic indicator
  if (!iconConfig) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 ${className}`}>
        <Sparkles className="w-4 h-4" />
        <span className="sr-only">{name}</span>
      </span>
    );
  }

  const Icon = iconConfig.icon;
  const colorClass = iconConfig.color || 'text-gray-600 dark:text-gray-400';

  return (
    <span className={`inline-flex items-center ${className}`}>
      <Icon
        className={`w-5 h-5 ${colorClass}`}
        aria-label={name}
      />
    </span>
  );
}
