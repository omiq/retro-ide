; Console I/O Demo for CP/M
; Demonstrates character input/output and string handling
; Z80 Assembly Language

        ORG     0100H           ; CP/M program start address

START:  LD      DE, TITLE       ; Display title
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      DE, INSTRUCT    ; Display instructions
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

INPUT_LOOP:
        LD      DE, PROMPT      ; Display prompt
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      DE, BUFFER      ; Input buffer
        LD      C, 0AH          ; Read line
        CALL    0005H           ; Call BDOS

        LD      A, (BUFFER+1)   ; Get character count
        OR      A               ; Check if zero
        JR      Z, INPUT_LOOP   ; Loop if empty

        LD      DE, ECHO        ; Echo message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      DE, BUFFER+2    ; Start of input text
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      DE, NEWLINE     ; New line
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        ; Check for 'quit' command
        LD      HL, BUFFER+2    ; Start of input
        LD      DE, QUIT_CMD    ; 'quit' string
        LD      B, 4            ; Length of 'quit'
CHECK_QUIT:
        LD      A, (HL)         ; Get input character
        AND     0DFH            ; Convert to uppercase
        LD      C, A
        LD      A, (DE)         ; Get 'quit' character
        CP      C               ; Compare
        JR      NZ, INPUT_LOOP  ; Not 'quit', continue
        INC     HL              ; Next character
        INC     DE
        DJNZ    CHECK_QUIT      ; Check all characters

        LD      DE, GOODBYE     ; Goodbye message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      C, 00H          ; Exit to CP/M
        CALL    0005H           ; Call BDOS

TITLE:   DB     'Console I/O Demo', 0DH, 0AH
         DB     '===============', 0DH, 0AH, '$'

INSTRUCT: DB    'Type text and press ENTER.', 0DH, 0AH
          DB    'Type "quit" to exit.', 0DH, 0AH, '$'

PROMPT:   DB    '> $'

ECHO:     DB    'You typed: $'

NEWLINE:  DB    0DH, 0AH, '$'

GOODBYE:  DB    'Goodbye!', 0DH, 0AH, '$'

QUIT_CMD: DB    'QUIT'

BUFFER:   DB    80              ; Buffer size
          DB    0               ; Character count
          DS    80              ; Input buffer

        END     START
