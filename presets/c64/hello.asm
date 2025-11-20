// KickAss Assembler - Hello World Example for C64
// This file uses KickAss assembler syntax

BasicUpstart2(start)

start:
    jsr $e544    // clear screen
    ldy #0
loop:
    lda message,y    // load message byte
    beq end          // 0 = end of string
    sta $400+41,y    // store to screen
    iny
    bne loop         // next character
end:
    jmp end           // infinite loop

message:
    .text "hello world!"
    .byte 0

