#ifndef BBC_COMMON_H
#define BBC_COMMON_H

// BBC Micro (Model B) - 6502-based home computer
// Memory map and hardware definitions

// Memory addresses
#define BBC_SCREEN_START    0x3000
#define BBC_SCREEN_END      0x7FFF
#define BBC_OS_START        0xC000
#define BBC_OS_END          0xFFFF

// Hardware registers
#define BBC_6845_CRTC       0xFE00
#define BBC_SYSTEM_VIA      0xFE40
#define BBC_USER_VIA        0xFE60
#define BBC_ACIA            0xFE08

// BBC BASIC keywords and functions
#define BBC_PRINT           0x8D
#define BBC_GOTO            0x8E
#define BBC_GOSUB           0x8F
#define BBC_RETURN          0x90
#define BBC_FOR             0x91
#define BBC_NEXT            0x92
#define BBC_IF              0x93
#define BBC_THEN            0x94
#define BBC_ELSE            0x95
#define BBC_REPEAT          0x96
#define BBC_UNTIL           0x97
#define BBC_WHILE           0x98
#define BBC_ENDWHILE        0x99
#define BBC_PROC            0x9A
#define BBC_ENDPROC         0x9B
#define BBC_LOCAL           0x9C
#define BBC_DEF             0x9D
#define BBC_ENDDEF          0x9E

// BBC Micro screen modes
#define BBC_MODE0           0  // 640x256, 2 colors
#define BBC_MODE1           1  // 320x256, 4 colors
#define BBC_MODE2           2  // 160x256, 16 colors
#define BBC_MODE3           3  // 640x256, 4 colors
#define BBC_MODE4           4  // 320x256, 2 colors
#define BBC_MODE5           5  // 160x256, 4 colors
#define BBC_MODE6           6  // 640x256, 2 colors
#define BBC_MODE7           7  // 40x25, teletext

// BBC Micro colors
#define BBC_BLACK           0
#define BBC_RED             1
#define BBC_GREEN           2
#define BBC_YELLOW          3
#define BBC_BLUE            4
#define BBC_MAGENTA         5
#define BBC_CYAN            6
#define BBC_WHITE           7

// BBC Micro key codes
#define BBC_KEY_BREAK       0x80
#define BBC_KEY_COPY        0x81
#define BBC_KEY_LEFT        0x8B
#define BBC_KEY_RIGHT       0x8C
#define BBC_KEY_DOWN        0x8D
#define BBC_KEY_UP          0x8E

// OS calls
#define BBC_OSWRCH          0xFFEE  // Write character to output
#define BBC_OSRDCH          0xFFE0  // Read character from input
#define BBC_OSWORD          0xFFF1  // Word parameter block
#define BBC_OSBYTE          0xFFF4  // Byte parameter block
#define BBC_OSCLI           0xFFF7  // Command line interpreter
#define BBC_OSFILE          0xFFDD  // File operations
#define BBC_OSARGS          0xFFDA  // File arguments
#define BBC_OSBGET          0xFFD7  // Get byte from file
#define BBC_OSBPUT          0xFFD4  // Put byte to file
#define BBC_OSGBPB          0xFFD1  // Get/Put block
#define BBC_OSFIND          0xFFCE  // Find file
#define BBC_OSNEWL          0xFFE7  // New line
#define BBC_OSASCI          0xFFE3  // ASCII character
#define BBC_OSCRLF          0xFFED  // Carriage return + line feed

// BBC Micro system variables
#define BBC_OSWRCH_VECTOR   0x0208
#define BBC_OSRDCH_VECTOR   0x0210
#define BBC_OSWORD_VECTOR   0x0200
#define BBC_OSBYTE_VECTOR   0x0204
#define BBC_OSCLI_VECTOR    0x020C
#define BBC_IRQ_VECTOR      0x0202
#define BBC_NMI_VECTOR      0x0206

// BBC Micro workspace
#define BBC_WORKSPACE       0x0000
#define BBC_STACK           0x0100

#endif // BBC_COMMON_H 