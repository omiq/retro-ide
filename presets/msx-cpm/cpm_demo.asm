; CP/M System Call Demo
; Demonstrates various CP/M BDOS functions
; Z80 Assembly Language

        ORG     0100H           ; CP/M program start address

START:  LD      DE, WELCOME     ; Welcome message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      DE, PROMPT      ; Prompt for input
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      C, 01H          ; Read character
        CALL    0005H           ; Call BDOS
        LD      (INPUT_CHAR), A ; Store input

        LD      DE, ECHO        ; Echo message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      A, (INPUT_CHAR) ; Get input character
        LD      E, A            ; Put in E register
        LD      C, 02H          ; Write character
        CALL    0005H           ; Call BDOS

        LD      DE, NEWLINE     ; New line
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      DE, MEMORY      ; Memory info
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      C, 00H          ; Exit to CP/M
        CALL    0005H           ; Call BDOS

WELCOME: DB     'CP/M System Call Demo', 0DH, 0AH
         DB     '=====================', 0DH, 0AH, '$'

PROMPT:  DB     'Press any key: $'

ECHO:    DB     'You pressed: $'

NEWLINE: DB     0DH, 0AH, '$'

MEMORY:  DB     'Memory: 64KB available', 0DH, 0AH
         DB     'CPU: Z80 @ 3.58MHz', 0DH, 0AH
         DB     'OS: MSX-DOS/CP/M compatible', 0DH, 0AH, '$'

INPUT_CHAR: DB  0               ; Storage for input character

        END     START
