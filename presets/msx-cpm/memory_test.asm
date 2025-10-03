; Memory Test for MSX/CP/M
; Tests RAM from 0xC000 to 0xF000
; Z80 Assembly Language

        ORG     0100H           ; CP/M program start address

START:  LD      DE, TITLE       ; Display title
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      DE, TESTING     ; Display testing message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        ; Test pattern 1: 0xAA
        LD      A, 0AAH         ; Test pattern
        CALL    MEMORY_TEST     ; Test memory

        ; Test pattern 2: 0x55
        LD      A, 055H         ; Test pattern
        CALL    MEMORY_TEST     ; Test memory

        ; Test pattern 3: 0xFF
        LD      A, 0FFH         ; Test pattern
        CALL    MEMORY_TEST     ; Test memory

        ; Test pattern 4: 0x00
        LD      A, 000H         ; Test pattern
        CALL    MEMORY_TEST     ; Test memory

        LD      DE, COMPLETE    ; Display completion message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS

        LD      C, 00H          ; Exit to CP/M
        CALL    0005H           ; Call BDOS

MEMORY_TEST:
        PUSH    AF              ; Save test pattern
        LD      DE, TEST_MSG    ; Display test message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS
        POP     AF              ; Restore test pattern

        PUSH    AF              ; Save test pattern
        LD      E, A            ; Put pattern in E
        LD      C, 02H          ; Write character
        CALL    0005H           ; Call BDOS
        POP     AF              ; Restore test pattern

        LD      HL, 0C000H      ; Start address
        LD      DE, 0F000H      ; End address
        LD      B, A            ; Save test pattern

WRITE_LOOP:
        LD      (HL), B         ; Write pattern
        INC     HL              ; Next address
        LD      A, H            ; Check high byte
        CP      D               ; Compare with end high byte
        JR      NZ, WRITE_LOOP  ; Continue if not at end
        LD      A, L            ; Check low byte
        CP      E               ; Compare with end low byte
        JR      NZ, WRITE_LOOP  ; Continue if not at end

        ; Now read back and verify
        LD      HL, 0C000H      ; Start address
        LD      DE, 0F000H      ; End address

READ_LOOP:
        LD      A, (HL)         ; Read byte
        CP      B               ; Compare with pattern
        JR      NZ, ERROR       ; Jump if error
        INC     HL              ; Next address
        LD      A, H            ; Check high byte
        CP      D               ; Compare with end high byte
        JR      NZ, READ_LOOP   ; Continue if not at end
        LD      A, L            ; Check low byte
        CP      E               ; Compare with end low byte
        JR      NZ, READ_LOOP   ; Continue if not at end

        LD      DE, OK_MSG      ; Success message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS
        RET                     ; Return

ERROR:  LD      DE, ERR_MSG     ; Error message
        LD      C, 09H          ; Print string
        CALL    0005H           ; Call BDOS
        RET                     ; Return

TITLE:   DB     'Memory Test for MSX/CP/M', 0DH, 0AH
         DB     '========================', 0DH, 0AH, '$'

TESTING: DB     'Testing RAM from 0xC000 to 0xF000', 0DH, 0AH, '$'

TEST_MSG: DB    'Testing pattern 0x$'

OK_MSG:   DB    ' - PASS', 0DH, 0AH, '$'

ERR_MSG:  DB    ' - FAIL', 0DH, 0AH, '$'

COMPLETE: DB    'Memory test completed.', 0DH, 0AH, '$'

        END     START
