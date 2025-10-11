; Hello World example using cc65 assembler (ca65)
; This demonstrates basic screen output and raster effects

.include "c64.inc"

; BASIC header to make this a runnable program
.segment "EXEHDR"
        .word   $0801
        .word   BASIC_END
        .word   10
        .byte   $9e, " 2062", 0
BASIC_END:
        .word   0

; Main program code
.segment "CODE"

; Variables
TEMP = $02

; Main entry point
main:
        sei                     ; disable interrupts
        ldy #0                  ; initialize counter
        
; Print "HELLO WORLD" to screen
print_loop:
        lda message,y           ; load character
        beq print_done          ; if zero, we're done
        clc
        adc #$40                ; convert to screen code
        sta $400+41,y           ; store to screen memory
        iny
        bne print_loop          ; continue until Y wraps (or we hit null)
        
print_done:

; Raster effect loop
wait1:
        lda $d011               ; get VIC status
        bmi wait1               ; wait for line < 256
        
wait2:
        lda $d012               ; get current raster line
wait3:
        cmp $d012               ; wait for line to change
        beq wait3
        lsr                     ; divide by 2
        lsr                     ; divide by 2 again
        clc
        adc TEMP                ; add frame counter
        sta $d020               ; set border color
        lda $d011               ; get status bits
        bpl wait2               ; repeat until line >= 256
        sty $d020               ; reset border color
        dec TEMP                ; change frame counter
        jmp wait1               ; endless loop

; Message data
message:
        .byte "HELLO WORLD", 0
