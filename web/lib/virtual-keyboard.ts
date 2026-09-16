export type KeyboardLayoutName = 'ABNT2' | 'US-INTERNATIONAL';

export const KEY_LAYOUTS: Record<KeyboardLayoutName, string[][]> = {
  ABNT2: [
    ["'", '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '´', '[', 'Enter'],
    ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ç', '~', ']', 'Enter'],
    ['Shift', '\\', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', ';', '/', 'Shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'AltGr', 'Win', 'Menu', 'Ctrl'],
  ],
  'US-INTERNATIONAL': [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Menu', 'Ctrl'],
  ],
};

export const NUMPAD_LAYOUT: Array<Array<string | null>> = [
  ['NumLock', 'NumDiv', 'NumMul', 'NumMinus'],
  ['Num7', 'Num8', 'Num9', 'NumAdd'],
  ['Num4', 'Num5', 'Num6', null],
  ['Num1', 'Num2', 'Num3', 'NumEnter'],
  ['Num0', null, 'NumDec', null],
];

export const NUMPAD_SPANS: Record<string, { x?: number; y?: number }> = {
  Num0: { x: 2 },
  NumAdd: { y: 2 },
  NumEnter: { y: 2 },
};

export interface KeyCaption {
  shift?: string;
  altgr?: string;
}

const ABNT2_CAPTIONS: Record<string, KeyCaption> = {
  "'": { shift: '"', altgr: '[' },
  '1': { shift: '!', altgr: '¹' },
  '2': { shift: '@', altgr: '²' },
  '3': { shift: '#', altgr: '³' },
  '4': { shift: '$', altgr: '£' },
  '5': { shift: '%', altgr: '¢' },
  '6': { shift: '¨', altgr: '¬' },
  '7': { shift: '&' },
  '8': { shift: '*' },
  '9': { shift: '(' },
  '0': { shift: ')' },
  '-': { shift: '_' },
  '=': { shift: '+' },
  '´': { shift: '¨', altgr: '^' },
  '[': { shift: '{' },
  ']': { shift: '}' },
  'ç': { shift: 'Ç' },
  '~': { shift: '^' },
  'q': { altgr: '/' },
  'w': { altgr: '?' },
  'e': { altgr: '°' },
  'p': { altgr: '§' },
  'o': { altgr: 'º' },
  'a': { altgr: 'ª' },
  'l': { altgr: '|' },
  'z': { altgr: '«' },
  'x': { altgr: '»' },
  ',': { shift: '<' },
  '.': { shift: '>' },
  ';': { shift: ':' },
  '/': { shift: '?' },
};

const US_INTERNATIONAL_CAPTIONS: Record<string, KeyCaption> = {
  '`': { shift: '~' },
  '1': { shift: '!' },
  '2': { shift: '@' },
  '3': { shift: '#' },
  '4': { shift: '$' },
  '5': { shift: '%' },
  '6': { shift: '^' },
  '7': { shift: '&' },
  '8': { shift: '*' },
  '9': { shift: '(' },
  '0': { shift: ')' },
  '-': { shift: '_' },
  '=': { shift: '+' },
  '[': { shift: '{' },
  ']': { shift: '}' },
  '\\': { shift: '|' },
  ';': { shift: ':' },
  "'": { shift: '"' },
  ',': { shift: '<' },
  '.': { shift: '>' },
  '/': { shift: '?' },
};

export const KEY_WIDTHS: Record<string, number> = {
  Backspace: 2.0,
  Tab: 1.5,
  CapsLock: 1.75,
  Enter: 2.25,
  Shift: 2.25,
  Ctrl: 1.25,
  Win: 1.25,
  Alt: 1.25,
  Space: 6.25,
  AltGr: 1.25,
  Menu: 1.25,
  '\\': 1.5,
};

export type FingerZone =
  | 'L_PINKY'
  | 'L_RING'
  | 'L_MIDDLE'
  | 'L_INDEX'
  | 'R_INDEX'
  | 'R_MIDDLE'
  | 'R_RING'
  | 'R_PINKY'
  | 'THUMB';

export const FINGER_NAMES: Record<FingerZone, string> = {
  L_PINKY: 'Mínimo',
  L_RING: 'Anelar',
  L_MIDDLE: 'Médio',
  L_INDEX: 'Indicador',
  R_INDEX: 'Indicador',
  R_MIDDLE: 'Médio',
  R_RING: 'Anelar',
  R_PINKY: 'Mínimo',
  THUMB: 'Polegar',
};

export const FINGER_COLORS: Record<FingerZone, string> = {
  L_PINKY: '#E5484D',
  L_RING: '#F76B15',
  L_MIDDLE: '#E5B90A',
  L_INDEX: '#30A46C',
  R_INDEX: '#3BC0E0',
  R_MIDDLE: '#5B7CFA',
  R_RING: '#A78BFA',
  R_PINKY: '#E164A3',
  THUMB: '#8B8F98',
};

const NUMPAD_FINGER_GROUP: Array<[ReadonlySet<string>, FingerZone]> = [
  [new Set(['NumDiv', 'NumMul', 'NumMinus', 'NumAdd', 'NumEnter', 'NumLock']), 'R_PINKY'],
  [new Set(['Num7', 'Num4', 'Num1']), 'R_INDEX'],
  [new Set(['Num8', 'Num5', 'Num2']), 'R_MIDDLE'],
  [new Set(['Num9', 'Num6', 'Num3', 'NumDec', 'Num0']), 'R_RING'],
];

const FINGER_GROUPS: Record<KeyboardLayoutName, Array<[ReadonlySet<string>, FingerZone]>> = {
  ABNT2: [
    [new Set(["'", '1', 'q', 'a', 'z', 'Tab', 'CapsLock', 'Alt', '\\']), 'L_PINKY'],
    [new Set(['2', 'w', 's', 'x']), 'L_RING'],
    [new Set(['3', 'e', 'd', 'c']), 'L_MIDDLE'],
    [new Set(['4', '5', 'r', 't', 'f', 'g', 'v', 'b']), 'L_INDEX'],
    [new Set(['6', '7', 'y', 'u', 'h', 'j', 'n', 'm']), 'R_INDEX'],
    [new Set(['8', 'i', 'k', ',']), 'R_MIDDLE'],
    [new Set(['9', 'o', 'l', '.']), 'R_RING'],
    [
      new Set([
        '0', '-', '=', 'p', '´', '[', ']', ';', ':', '/', '~', 'ç', ',', '.', 'Enter', 'Backspace',
      ]),
      'R_PINKY',
    ],
    [new Set(['Space', 'Ctrl', 'Win', 'Menu', 'AltGr']), 'THUMB'],
    ...NUMPAD_FINGER_GROUP,
  ],
  'US-INTERNATIONAL': [
    [new Set(['`', "'", '1', 'q', 'a', 'z', 'Tab', 'CapsLock', 'Alt']), 'L_PINKY'],
    [new Set(['2', 'w', 's', 'x']), 'L_RING'],
    [new Set(['3', 'e', 'd', 'c']), 'L_MIDDLE'],
    [new Set(['4', '5', 'r', 't', 'f', 'g', 'v', 'b']), 'L_INDEX'],
    [new Set(['6', '7', 'y', 'u', 'h', 'j', 'n', 'm']), 'R_INDEX'],
    [new Set(['8', 'i', 'k', ',']), 'R_MIDDLE'],
    [new Set(['9', 'o', 'l', '.']), 'R_RING'],
    [
      new Set([
        '0', '-', '=', 'p', '[', ']', '\\', ';', "'", ':', '/', 'Enter', 'Backspace',
      ]),
      'R_PINKY',
    ],
    [new Set(['Space', 'Ctrl', 'Win', 'Menu', 'AltGr']), 'THUMB'],
    ...NUMPAD_FINGER_GROUP,
  ],
};

export interface KeyCap {
  label: string;
  finger: FingerZone;
  color: string;
  width: number;
  display: string;
  isModifier: boolean;
  caption?: KeyCaption;
  spanX?: number;
  spanY?: number;
}

export interface KeyboardModel {
  name: KeyboardLayoutName;
  rows: KeyCap[][];
  numpad: Array<Array<KeyCap | null>>;
  keyIndex: Map<string, KeyCap>;
}

const MODIFIER_KEYS = new Set(['Shift', 'Ctrl', 'Alt', 'AltGr', 'CapsLock', 'Tab', 'NumLock']);

function displayLabel(label: string): string {
  switch (label) {
    case 'Backspace':
      return '⌫';
    case 'Tab':
      return '⇥';
    case 'CapsLock':
      return '⇪';
    case 'Enter':
      return '⏎';
    case 'Shift':
      return '⇧';
    case 'Ctrl':
      return 'Ctrl';
    case 'Win':
      return '⌘';
    case 'Alt':
      return 'Alt';
    case 'AltGr':
      return 'AltGr';
    case 'Menu':
      return '☰';
    case 'Space':
      return 'Space';
    case '?/Shift':
      return '? ⇧';
    case 'NumLock':
      return 'Num';
    case 'NumDiv':
      return '/';
    case 'NumMul':
      return '*';
    case 'NumMinus':
      return '−';
    case 'NumAdd':
      return '+';
    case 'NumEnter':
      return '⏎';
    case 'NumDec':
      return ',';
    case 'Num0':
      return '0';
    case 'Num1':
      return '1';
    case 'Num2':
      return '2';
    case 'Num3':
      return '3';
    case 'Num4':
      return '4';
    case 'Num5':
      return '5';
    case 'Num6':
      return '6';
    case 'Num7':
      return '7';
    case 'Num8':
      return '8';
    case 'Num9':
      return '9';
    default:
      return label;
  }
}

export function buildKeyboardModel(layoutName: string): KeyboardModel {
  const name: KeyboardLayoutName = layoutName === 'US-INTERNATIONAL' ? 'US-INTERNATIONAL' : 'ABNT2';
  const captions = name === 'ABNT2' ? ABNT2_CAPTIONS : US_INTERNATIONAL_CAPTIONS;
  const fingerMap = new Map<string, FingerZone>();
  for (const [keys, finger] of FINGER_GROUPS[name]) {
    for (const key of keys) {
      fingerMap.set(key, finger);
    }
  }
  const rows = KEY_LAYOUTS[name].map((row) =>
    row.map((label, colIndex) => {
      let finger = fingerMap.get(label) ?? 'THUMB';
      if (label === 'Shift') {
        finger = colIndex === 0 ? 'L_PINKY' : 'R_PINKY';
      }
      return {
        label,
        finger,
        color: FINGER_COLORS[finger],
        width: KEY_WIDTHS[label] ?? 1.0,
        display: displayLabel(label),
        isModifier: MODIFIER_KEYS.has(label),
        caption: captions[label],
      };
    }),
  );
  const keyIndex = new Map<string, KeyCap>();
  for (const row of rows) {
    for (const key of row) {
      keyIndex.set(key.label, key);
    }
  }
  const numpad = NUMPAD_LAYOUT.map((row) =>
    row.map((label) => {
      if (label === null) {
        return null;
      }
      const finger = fingerMap.get(label) ?? 'THUMB';
      const span = NUMPAD_SPANS[label];
      return {
        label,
        finger,
        color: FINGER_COLORS[finger],
        width: KEY_WIDTHS[label] ?? 1.0,
        display: displayLabel(label),
        isModifier: MODIFIER_KEYS.has(label),
        spanX: span?.x,
        spanY: span?.y,
      } as KeyCap;
    }),
  );
  for (const row of numpad) {
    for (const key of row) {
      if (key !== null) {
        keyIndex.set(key.label, key);
      }
    }
  }
  return { name, rows, numpad, keyIndex };
}

const CODE_POSITION: Record<KeyboardLayoutName, ReadonlyMap<string, [number, number]>> = {
  ABNT2: new Map([
    ['Backquote', [0, 0]],
    ['Digit1', [0, 1]],
    ['Digit2', [0, 2]],
    ['Digit3', [0, 3]],
    ['Digit4', [0, 4]],
    ['Digit5', [0, 5]],
    ['Digit6', [0, 6]],
    ['Digit7', [0, 7]],
    ['Digit8', [0, 8]],
    ['Digit9', [0, 9]],
    ['Digit0', [0, 10]],
    ['Minus', [0, 11]],
    ['Equal', [0, 12]],
    ['Backspace', [0, 13]],
    ['Tab', [1, 0]],
    ['KeyQ', [1, 1]],
    ['KeyW', [1, 2]],
    ['KeyE', [1, 3]],
    ['KeyR', [1, 4]],
    ['KeyT', [1, 5]],
    ['KeyY', [1, 6]],
    ['KeyU', [1, 7]],
    ['KeyI', [1, 8]],
    ['KeyO', [1, 9]],
    ['KeyP', [1, 10]],
    ['BracketLeft', [1, 11]],
    ['BracketRight', [1, 12]],
    ['Enter', [1, 13]],
    ['CapsLock', [2, 0]],
    ['KeyA', [2, 1]],
    ['KeyS', [2, 2]],
    ['KeyD', [2, 3]],
    ['KeyF', [2, 4]],
    ['KeyG', [2, 5]],
    ['KeyH', [2, 6]],
    ['KeyJ', [2, 7]],
    ['KeyK', [2, 8]],
    ['KeyL', [2, 9]],
    ['Semicolon', [2, 10]],
    ['Quote', [2, 11]],
    ['Backslash', [2, 12]],
    ['ShiftLeft', [3, 0]],
    ['IntlBackslash', [3, 1]],
    ['KeyZ', [3, 2]],
    ['KeyX', [3, 3]],
    ['KeyC', [3, 4]],
    ['KeyV', [3, 5]],
    ['KeyB', [3, 6]],
    ['KeyN', [3, 7]],
    ['KeyM', [3, 8]],
    ['Comma', [3, 9]],
    ['Period', [3, 10]],
    ['Slash', [3, 11]],
    ['IntlRo', [3, 12]],
    ['ShiftRight', [3, 13]],
    ['ControlLeft', [4, 0]],
    ['MetaLeft', [4, 1]],
    ['AltLeft', [4, 2]],
    ['Space', [4, 3]],
    ['AltRight', [4, 4]],
    ['MetaRight', [4, 5]],
    ['ContextMenu', [4, 6]],
    ['ControlRight', [4, 7]],
  ]),
  'US-INTERNATIONAL': new Map([
    ['Backquote', [0, 0]],
    ['Digit1', [0, 1]],
    ['Digit2', [0, 2]],
    ['Digit3', [0, 3]],
    ['Digit4', [0, 4]],
    ['Digit5', [0, 5]],
    ['Digit6', [0, 6]],
    ['Digit7', [0, 7]],
    ['Digit8', [0, 8]],
    ['Digit9', [0, 9]],
    ['Digit0', [0, 10]],
    ['Minus', [0, 11]],
    ['Equal', [0, 12]],
    ['Backspace', [0, 13]],
    ['Tab', [1, 0]],
    ['KeyQ', [1, 1]],
    ['KeyW', [1, 2]],
    ['KeyE', [1, 3]],
    ['KeyR', [1, 4]],
    ['KeyT', [1, 5]],
    ['KeyY', [1, 6]],
    ['KeyU', [1, 7]],
    ['KeyI', [1, 8]],
    ['KeyO', [1, 9]],
    ['KeyP', [1, 10]],
    ['BracketLeft', [1, 11]],
    ['BracketRight', [1, 12]],
    ['Backslash', [1, 13]],
    ['CapsLock', [2, 0]],
    ['KeyA', [2, 1]],
    ['KeyS', [2, 2]],
    ['KeyD', [2, 3]],
    ['KeyF', [2, 4]],
    ['KeyG', [2, 5]],
    ['KeyH', [2, 6]],
    ['KeyJ', [2, 7]],
    ['KeyK', [2, 8]],
    ['KeyL', [2, 9]],
    ['Semicolon', [2, 10]],
    ['Quote', [2, 11]],
    ['Enter', [2, 13]],
    ['ShiftLeft', [3, 0]],
    ['KeyZ', [3, 1]],
    ['KeyX', [3, 2]],
    ['KeyC', [3, 3]],
    ['KeyV', [3, 4]],
    ['KeyB', [3, 5]],
    ['KeyN', [3, 6]],
    ['KeyM', [3, 7]],
    ['Comma', [3, 8]],
    ['Period', [3, 9]],
    ['Slash', [3, 10]],
    ['ShiftRight', [3, 11]],
    ['ControlLeft', [4, 0]],
    ['MetaLeft', [4, 1]],
    ['AltLeft', [4, 2]],
    ['Space', [4, 3]],
    ['AltRight', [4, 4]],
    ['MetaRight', [4, 5]],
    ['ContextMenu', [4, 6]],
    ['ControlRight', [4, 7]],
  ]),
};

const CODE_LABELS: Record<string, string> = {
  Enter: 'Enter',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Space: 'Space',
  CapsLock: 'CapsLock',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  MetaLeft: 'Win',
  MetaRight: 'Win',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  ContextMenu: 'Menu',
};

const NUMPAD_CODE_LABELS: Record<string, string> = {
  NumLock: 'NumLock',
  NumpadDivide: 'NumDiv',
  NumpadMultiply: 'NumMul',
  NumpadSubtract: 'NumMinus',
  NumpadAdd: 'NumAdd',
  NumpadEnter: 'NumEnter',
  NumpadDecimal: 'NumDec',
  Numpad0: 'Num0',
  Numpad1: 'Num1',
  Numpad2: 'Num2',
  Numpad3: 'Num3',
  Numpad4: 'Num4',
  Numpad5: 'Num5',
  Numpad6: 'Num6',
  Numpad7: 'Num7',
  Numpad8: 'Num8',
  Numpad9: 'Num9',
};

export function resolveKeyLabel(code: string, key: string, model: KeyboardModel): string | null {
  const numpadLabel = NUMPAD_CODE_LABELS[code];
  if (numpadLabel !== undefined) {
    return numpadLabel;
  }
  if (key === ' ') {
    return 'Space';
  }
  const position = CODE_POSITION[model.name].get(code);
  if (position !== undefined) {
    const [row, col] = position;
    const label = model.rows[row]?.[col]?.label;
    if (label !== undefined) {
      return label;
    }
  }
  const label = CODE_LABELS[code];
  if (label !== undefined) {
    return label;
  }
  const lower = key.toLowerCase();
  if (model.keyIndex.has(lower)) {
    return lower;
  }
  return null;
}