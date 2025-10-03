; Hello World for MSX-DOS/CP/M
; Z80 Assembly Language
; Demonstrates basic CP/M system calls

        ORG     0100H           ; CP/M program start address

START:  LD      DE, MESSAGE     ; Load address of message
        LD      C, 09H          ; CP/M print string function
        CALL    0005H           ; Call BDOS
        LD      C, 00H          ; CP/M exit function
        CALL    0005H           ; Call BDOS

MESSAGE: DB     'Hello, MSX-DOS World!', 0DH, 0AH
         DB     'This is a CP/M compatible program.', 0DH, 0AH
         DB     'Running on Z80 CPU emulation.', 0DH, 0AH, '$'

        END     START
