import Carbon
import SwiftUI

extension Int {
	/// Returns a user-friendly string representation for common key codes.
	public var keyCharacter: String {
		switch self {
		case kVK_ANSI_A: return "A"
		case kVK_ANSI_B: return "B"
		case kVK_ANSI_C: return "C"
		case kVK_ANSI_D: return "D"
		case kVK_ANSI_E: return "E"
		case kVK_ANSI_F: return "F"
		case kVK_ANSI_G: return "G"
		case kVK_ANSI_H: return "H"
		case kVK_ANSI_I: return "I"
		case kVK_ANSI_J: return "J"
		case kVK_ANSI_K: return "K"
		case kVK_ANSI_L: return "L"
		case kVK_ANSI_M: return "M"
		case kVK_ANSI_N: return "N"
		case kVK_ANSI_O: return "O"
		case kVK_ANSI_P: return "P"
		case kVK_ANSI_Q: return "Q"
		case kVK_ANSI_R: return "R"
		case kVK_ANSI_S: return "S"
		case kVK_ANSI_T: return "T"
		case kVK_ANSI_U: return "U"
		case kVK_ANSI_V: return "V"
		case kVK_ANSI_W: return "W"
		case kVK_ANSI_X: return "X"
		case kVK_ANSI_Y: return "Y"
		case kVK_ANSI_Z: return "Z"
		case kVK_ANSI_0: return "0"
		case kVK_ANSI_1: return "1"
		case kVK_ANSI_2: return "2"
		case kVK_ANSI_3: return "3"
		case kVK_ANSI_4: return "4"
		case kVK_ANSI_5: return "5"
		case kVK_ANSI_6: return "6"
		case kVK_ANSI_7: return "7"
		case kVK_ANSI_8: return "8"
		case kVK_ANSI_9: return "9"
		case kVK_Space: return "Space"
		case kVK_Return: return "↩"
		case kVK_Tab: return "⇥"
		case kVK_Delete: return "⌫"
		case kVK_Escape: return "⎋"
		case kVK_ForwardDelete: return "⌦"
		case kVK_LeftArrow: return "←"
		case kVK_RightArrow: return "→"
		case kVK_UpArrow: return "↑"
		case kVK_DownArrow: return "↓"
		case kVK_F1: return "F1"
		case kVK_F2: return "F2"
		case kVK_F3: return "F3"
		case kVK_F4: return "F4"
		case kVK_F5: return "F5"
		case kVK_F6: return "F6"
		case kVK_F7: return "F7"
		case kVK_F8: return "F8"
		case kVK_F9: return "F9"
		case kVK_F10: return "F10"
		case kVK_F11: return "F11"
		case kVK_F12: return "F12"
		default: return "?"
		}
	}
}

extension UInt32 {
	/// Checks if the Command key modifier is present.
	var isCommandKey: Bool {
		(self & UInt32(cmdKey)) != 0
	}

	/// Checks if the Control key modifier is present.
	var isControlKey: Bool {
		(self & UInt32(controlKey)) != 0
	}

	/// Checks if the Option key modifier is present.
	var isOptionKey: Bool {
		(self & UInt32(optionKey)) != 0
	}

	/// Checks if the Shift key modifier is present.
	var isShiftKey: Bool {
		(self & UInt32(shiftKey)) != 0
	}

	/// The ``SwiftUI.EventModifiers`` equivalents for Carbon modifiers.
	var modifiers: SwiftUI.EventModifiers {
		var modifiers: SwiftUI.EventModifiers = []

		if self & UInt32(cmdKey) != 0 {
			modifiers.insert(.command)
		}
		if self & UInt32(shiftKey) != 0 {
			modifiers.insert(.shift)
		}
		if self & UInt32(optionKey) != 0 {
			modifiers.insert(.option)
		}
		if self & UInt32(controlKey) != 0 {
			modifiers.insert(.control)
		}

		return modifiers
	}

	/// The ``SwiftUI.KeyEquivalent`` equivalent for a Carbon key code.
	///
	/// Note that not all Carbon key codes have direct SwiftUI equivalents.
	var keyEquivalent: KeyEquivalent? {
		switch self {
		// Letters
		case UInt32(kVK_ANSI_A): return "a"
		case UInt32(kVK_ANSI_B): return "b"
		case UInt32(kVK_ANSI_C): return "c"
		case UInt32(kVK_ANSI_D): return "d"
		case UInt32(kVK_ANSI_E): return "e"
		case UInt32(kVK_ANSI_F): return "f"
		case UInt32(kVK_ANSI_G): return "g"
		case UInt32(kVK_ANSI_H): return "h"
		case UInt32(kVK_ANSI_I): return "i"
		case UInt32(kVK_ANSI_J): return "j"
		case UInt32(kVK_ANSI_K): return "k"
		case UInt32(kVK_ANSI_L): return "l"
		case UInt32(kVK_ANSI_M): return "m"
		case UInt32(kVK_ANSI_N): return "n"
		case UInt32(kVK_ANSI_O): return "o"
		case UInt32(kVK_ANSI_P): return "p"
		case UInt32(kVK_ANSI_Q): return "q"
		case UInt32(kVK_ANSI_R): return "r"
		case UInt32(kVK_ANSI_S): return "s"
		case UInt32(kVK_ANSI_T): return "t"
		case UInt32(kVK_ANSI_U): return "u"
		case UInt32(kVK_ANSI_V): return "v"
		case UInt32(kVK_ANSI_W): return "w"
		case UInt32(kVK_ANSI_X): return "x"
		case UInt32(kVK_ANSI_Y): return "y"
		case UInt32(kVK_ANSI_Z): return "z"
		// Numbers
		case UInt32(kVK_ANSI_0): return "0"
		case UInt32(kVK_ANSI_1): return "1"
		case UInt32(kVK_ANSI_2): return "2"
		case UInt32(kVK_ANSI_3): return "3"
		case UInt32(kVK_ANSI_4): return "4"
		case UInt32(kVK_ANSI_5): return "5"
		case UInt32(kVK_ANSI_6): return "6"
		case UInt32(kVK_ANSI_7): return "7"
		case UInt32(kVK_ANSI_8): return "8"
		case UInt32(kVK_ANSI_9): return "9"
		// Special keys
		case UInt32(kVK_Space): return .space
		case UInt32(kVK_Return): return .return
		case UInt32(kVK_Tab): return .tab
		case UInt32(kVK_Delete): return .delete
		case UInt32(kVK_Escape): return .escape
		case UInt32(kVK_UpArrow): return .upArrow
		case UInt32(kVK_DownArrow): return .downArrow
		case UInt32(kVK_LeftArrow): return .leftArrow
		case UInt32(kVK_RightArrow): return .rightArrow
		// Punctuation and symbols
		case UInt32(kVK_ANSI_Equal): return "="
		case UInt32(kVK_ANSI_Minus): return "-"
		case UInt32(kVK_ANSI_LeftBracket): return "["
		case UInt32(kVK_ANSI_RightBracket): return "]"
		case UInt32(kVK_ANSI_Quote): return "'"
		case UInt32(kVK_ANSI_Semicolon): return ";"
		case UInt32(kVK_ANSI_Backslash): return "\\"
		case UInt32(kVK_ANSI_Comma): return ","
		case UInt32(kVK_ANSI_Slash): return "/"
		case UInt32(kVK_ANSI_Period): return "."
		case UInt32(kVK_ANSI_Grave): return "`"
		default:
			return nil
		}
	}
}
