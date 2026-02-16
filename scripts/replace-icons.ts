import fs from 'fs';
import path from 'path';

// Icon replacement mapping
const iconReplacements: Record<string, string> = {
  // Pediatric (Teddy Bears) - 🧸
  'Bear': '🧸',
  'Teddy bear': '🧸',
  'bear': '🧸',
  'teddy bear': '🧸',
  'Bear icon': '🧸',
  'Bear with': '🧸',  // Catches "Bear with bandage", "Bear with stethoscope", etc.
  'A blue teddy bear': '🧸',
  'A teddy bear': '🧸',
  'A small teddy bear': '🧸',
  'A cartoon teddy bear': '🧸',

  // Hospital/Medical Facility - 🏥
  'Hospital': '🏥',
  'Hospital Icon': '🏥',
  'Hospital Logo': '🏥',
  'Hospital building': '🏥',
  'hospital': '🏥',

  // Phone/Communication - 📞
  'Phone': '📞',
  'Phone icon': '📞',
  'Hand Holding Phone': '📞',
  'A hand holding a phone': '📞',
  'Smartphone': '📱',

  // Emergency Vehicles
  'Ambulance': '🚑',
  'Fire Truck': '🚒',
  'Police Car': '🚓',

  // Medical Equipment
  'Needle': '💉',
  'Medicine bottle': '💊',
  'Oxygen tank': '🫁',

  // Other icons
  'Calendar': '📅',
  'Clock': '🕐',
  'Touch for YES': '👍',
  'thumbs up': '👍',
  'Touch for NO': '👎',
  'thumbs down': '👎',
  'Water bottle': '💧',
  'Flashlight': '🔦',
  'Paper with pen': '📝',
  'Blanket': '🛏️',
  'feather': '🪶',
};

// Complex patterns that need special handling
const complexReplacements: Array<{ pattern: RegExp; replacement: string }> = [
  // All bear/teddy bear variants (with any additional descriptors) - must be very broad
  { pattern: /&lt;img&gt;(?:A\s+)?(?:small\s+)?(?:blue\s+)?(?:cartoon\s+)?(?:[Bb]ear|[Tt]eddy\s+[Bb]ear)(?:\s+[Ii]con)?(?:\s+illustration)?(?:\s+sitting\s+up)?(?:\s+wearing\s+[^<]+)?(?:\s+with\s+[^<]+)?(?:\s+on\s+its\s+head)?\.?&lt;\/img&gt;/g, replacement: '🧸' },

  // Hospital variants
  { pattern: /&lt;img&gt;[Hh]ospital(?:\s+[Ii]con)?(?:\s+[Ll]ogo)?(?:\s+building)?(?:\s+icon)?\.?&lt;\/img&gt;/g, replacement: '🏥' },

  // Phone variants (including Smartphone)
  { pattern: /&lt;img&gt;(?:A\s+hand\s+holding\s+a\s+)?(?:[Pp]hone|[Ss]martphone)(?:\s+icon)?(?:\s+keypad)?\.?&lt;\/img&gt;/g, replacement: '📞' },
  { pattern: /&lt;img&gt;(?:Hand\s+Holding\s+)?[Pp]hone(?:\s+[Ii]con)?\.?&lt;\/img&gt;/g, replacement: '📞' },

  // Keep complex diagrams as descriptive text
  { pattern: /&lt;img&gt;(Diagram showing[^<]+)&lt;\/img&gt;/g, replacement: '[Diagram: $1]' },
  { pattern: /&lt;img&gt;(Body diagram[^<)]+)(?:\))?&lt;\/img&gt;/g, replacement: '[Diagram: $1]' },
  { pattern: /&lt;img&gt;(ECG showing[^<]+)&lt;\/img&gt;/g, replacement: '[ECG: $1]' },
  { pattern: /&lt;img&gt;(Electrocardiogram[^<]+)&lt;\/img&gt;/g, replacement: '[ECG: $1]' },
  { pattern: /&lt;img&gt;(Rule of 9's[^<]+)&lt;\/img&gt;/g, replacement: '[Diagram: $1]' },
  { pattern: /&lt;img&gt;(Surgical Cricothyrotomy[^<]+)&lt;\/img&gt;/g, replacement: '[Diagram: $1]' },

  // Medical/symptom icons with descriptive emoji
  { pattern: /&lt;img&gt;Chest Pain icon&lt;\/img&gt;/g, replacement: '💔' },
  { pattern: /&lt;img&gt;Can't Breathe icon&lt;\/img&gt;/g, replacement: '😮‍💨' },
  { pattern: /&lt;img&gt;Shortness of Breath icon&lt;\/img&gt;/g, replacement: '😮‍💨' },
  { pattern: /&lt;img&gt;Fever icon&lt;\/img&gt;/g, replacement: '🤒' },
  { pattern: /&lt;img&gt;Headache icon&lt;\/img&gt;/g, replacement: '🤕' },
  { pattern: /&lt;img&gt;Dizzy icon&lt;\/img&gt;/g, replacement: '😵‍💫' },
  { pattern: /&lt;img&gt;Confused icon&lt;\/img&gt;/g, replacement: '😕' },
  { pattern: /&lt;img&gt;Nauseous icon&lt;\/img&gt;/g, replacement: '🤢' },
  { pattern: /&lt;img&gt;Cough icon&lt;\/img&gt;/g, replacement: '🤧' },
  { pattern: /&lt;img&gt;Sore Throat icon&lt;\/img&gt;/g, replacement: '🤒' },
  { pattern: /&lt;img&gt;Burns icon&lt;\/img&gt;/g, replacement: '🔥' },
  { pattern: /&lt;img&gt;Choking icon&lt;\/img&gt;/g, replacement: '😵' },
  { pattern: /&lt;img&gt;Allergy icon&lt;\/img&gt;/g, replacement: '🤧' },

  // Emotional/behavioral icons
  { pattern: /&lt;img&gt;Sad face icon&lt;\/img&gt;/g, replacement: '😢' },
  { pattern: /&lt;img&gt;Worried face icon&lt;\/img&gt;/g, replacement: '😟' },
  { pattern: /&lt;img&gt;Angry face icon&lt;\/img&gt;/g, replacement: '😠' },
  { pattern: /&lt;img&gt;Frustrated (?:face|person) icon&lt;\/img&gt;/g, replacement: '😤' },
  { pattern: /&lt;img&gt;Anxiety Depression icon&lt;\/img&gt;/g, replacement: '😰' },
  { pattern: /&lt;img&gt;Suicidal skull icon&lt;\/img&gt;/g, replacement: '⚠️' },

  // Accessibility icons
  { pattern: /&lt;img&gt;Hearing Aid icon&lt;\/img&gt;/g, replacement: '🦻' },
  { pattern: /&lt;img&gt;Assistive Listening Device icon&lt;\/img&gt;/g, replacement: '🦻' },

  // Body/anatomy
  { pattern: /&lt;img&gt;Front human figure outline&lt;\/img&gt;/g, replacement: '🧍' },
  { pattern: /&lt;img&gt;Back human figure outline&lt;\/img&gt;/g, replacement: '🚶‍♂️' },
  { pattern: /&lt;img&gt;Hand with fingers spread icon&lt;\/img&gt;/g, replacement: '🖐️' },
  { pattern: /&lt;img&gt;Lips icon&lt;\/img&gt;/g, replacement: '👄' },
  { pattern: /&lt;img&gt;Red circle with line through it over lips icon&lt;\/img&gt;/g, replacement: '🚫👄' },

  // Medical equipment/supplies
  { pattern: /&lt;img&gt;Needle icon&lt;\/img&gt;/g, replacement: '💉' },
  { pattern: /&lt;img&gt;Medicine bottle icon&lt;\/img&gt;/g, replacement: '💊' },
  { pattern: /&lt;img&gt;Oxygen tank icon&lt;\/img&gt;/g, replacement: '🫁' },
  { pattern: /&lt;img&gt;Blanket icon&lt;\/img&gt;/g, replacement: '🛏️' },

  // Emergency vehicles (exact matches)
  { pattern: /&lt;img&gt;Ambulance&lt;\/img&gt;/g, replacement: '🚑' },
  { pattern: /&lt;img&gt;Fire Truck&lt;\/img&gt;/g, replacement: '🚒' },
  { pattern: /&lt;img&gt;Police Car&lt;\/img&gt;/g, replacement: '🚓' },

  // Utility icons
  { pattern: /&lt;img&gt;Calendar icon&lt;\/img&gt;/g, replacement: '📅' },
  { pattern: /&lt;img&gt;Clock icon&lt;\/img&gt;/g, replacement: '🕐' },
  { pattern: /&lt;img&gt;Water bottle icon&lt;\/img&gt;/g, replacement: '💧' },
  { pattern: /&lt;img&gt;feather&lt;\/img&gt;/g, replacement: '🪶' },

  // Flashlights (all variations)
  { pattern: /&lt;img&gt;Flashlight(?:\s+pointing\s+(?:up|down|left|right))?(?:\s+with\s+light\s+on)?&lt;\/img&gt;/g, replacement: '🔦' },

  // Other utility icons
  { pattern: /&lt;img&gt;Doctor icon&lt;\/img&gt;/g, replacement: '👨‍⚕️' },
  { pattern: /&lt;img&gt;Family icon&lt;\/img&gt;/g, replacement: '👨‍👩‍👧‍👦' },
  { pattern: /&lt;img&gt;Restroom icon&lt;\/img&gt;/g, replacement: '🚻' },
  { pattern: /&lt;img&gt;What happened icon&lt;\/img&gt;/g, replacement: '❓' },
  { pattern: /&lt;img&gt;Cold icon&lt;\/img&gt;/g, replacement: '🥶' },
  { pattern: /&lt;img&gt;Numbness icon&lt;\/img&gt;/g, replacement: '🫥' },
  { pattern: /&lt;img&gt;Paper (?:with|&amp;) [Pp]en icon&lt;\/img&gt;/g, replacement: '📝' },
  { pattern: /&lt;img&gt;Hospital Bed Icon&lt;\/img&gt;/gi, replacement: '🏥' },
  { pattern: /&lt;img&gt;Touch for YES icon \(thumbs up\)&lt;\/img&gt;/g, replacement: '👍' },
  { pattern: /&lt;img&gt;Touch for NO icon \(thumbs down\)&lt;\/img&gt;/g, replacement: '👎' },
  { pattern: /&lt;img&gt;Man lying down with legs raised&lt;\/img&gt;/g, replacement: '[Position: Supine with legs raised]' },

  // Documents/logos (keep as text)
  { pattern: /&lt;img&gt;Will\/DNR icon&lt;\/img&gt;/g, replacement: '[DNR Document]' },
  { pattern: /&lt;img&gt;MAINE EMS logo&lt;\/img&gt;/g, replacement: '[Maine EMS]' },
  { pattern: /&lt;img&gt;Maine Department of [^<]+&lt;\/img&gt;/g, replacement: '[Maine Department Seal]' },
  { pattern: /&lt;img&gt;NEW ENGLAND Donor Services[^<]+&lt;\/img&gt;/g, replacement: '[Donor Services: 800.446.6362]' },
  { pattern: /&lt;img&gt;LZ logo&lt;\/img&gt;/g, replacement: '[LZ]' },

  // Pain scale
  { pattern: /&lt;img&gt;Pain Scale with smiley faces and numbers 0-10&lt;\/img&gt;/g, replacement: '[Pain Scale 0-10]' },

  // Child safety equipment (keep descriptive)
  { pattern: /&lt;img&gt;A child in a car seat\.&lt;\/img&gt;/g, replacement: '[Child car seat]' },
  { pattern: /&lt;img&gt;A child safety seat attached to a cot\.&lt;\/img&gt;/g, replacement: '[Car seat on cot]' },
  { pattern: /&lt;img&gt;An infant car bed attached to a cot\.&lt;\/img&gt;/g, replacement: '[Infant car bed on cot]' },
  { pattern: /&lt;img&gt;A child sitting in a stretcher harness device\.&lt;\/img&gt;/g, replacement: '[Stretcher harness]' },

  // Medical procedures (keep descriptive)
  { pattern: /&lt;img&gt;A patient lying supine with legs raised[^<]+&lt;\/img&gt;/g, replacement: '[Position: Supine with legs raised]' },
  { pattern: /&lt;img&gt;A medical professional assisting a patient who is blowing into a 10 mL syringe[^<]+&lt;\/img&gt;/g, replacement: '[Modified Valsalva maneuver]' },
  { pattern: /&lt;img&gt;(?:Man|Nurse) (?:blowing into|assisting)[^<]+&lt;\/img&gt;/g, replacement: '[Modified Valsalva maneuver]' },

  // Defibrillator pads diagram
  { pattern: /&lt;img&gt;A diagram showing two sets of defibrillator pads[^<]+&lt;\/img&gt;/g, replacement: '[Diagram: Defibrillator pad placement]' },
];

function replaceIcons(content: string): string {
  let result = content;

  // Apply complex replacements first (regex patterns)
  complexReplacements.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement);
  });

  return result;
}

function processProtocolFile(filePath: string): void {
  console.log(`Processing: ${path.basename(filePath)}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const updatedContent = replaceIcons(content);

  // Count replacements made
  const originalImgCount = (content.match(/&lt;img&gt;/g) || []).length;
  const updatedImgCount = (updatedContent.match(/&lt;img&gt;/g) || []).length;
  const replacedCount = originalImgCount - updatedImgCount;

  if (replacedCount > 0) {
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`  ✅ Replaced ${replacedCount} icons (${updatedImgCount} remaining)`);
  } else {
    console.log(`  ℹ️  No replacements made`);
  }
}

function main() {
  console.log('🔄 Replacing icon placeholders with emoji...\n');

  const protocolsDir = path.join(process.cwd(), 'public', 'data', 'protocols');
  const files = fs.readdirSync(protocolsDir).filter(f => f.endsWith('.json'));

  files.forEach(file => {
    const filePath = path.join(protocolsDir, file);
    processProtocolFile(filePath);
  });

  console.log('\n✨ Icon replacement complete!');
}

main();
