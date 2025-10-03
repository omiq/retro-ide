; MSX Hello World Assembly Program
; Simple Z80 assembly program for MSX

        .org    0x100

start:
        ; Clear screen
        call    0x00C3
        
        ; Position cursor at row 1, column 1
        ld      a, 1
        ld      h, 1
        call    0x00C6
        
        ; Print "Hello, MSX!"
        ld      hl, message
print_loop:
        ld      a, (hl)
        or      a
        jr      z, wait_key
        call    0x00A2
        inc     hl
        jr      print_loop
        
wait_key:
        ; Wait for key press
        call    0x009F
        
        ; Exit
        ret

message:
        .db     "Hello, MSX!", 13, 10, 0
