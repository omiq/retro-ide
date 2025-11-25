// Hello World program for the Vic 20
// Assembled with Kick Assembler
// Outputs "hello world" to the screen
// Requires expanded memory (config 5 = +8K expansion)

.encoding "petscii_mixed"

        *= $1201 "Basic Upstart"

        BasicUpstart(start)    // 10 sys$04097

.const CHAROUT = $ffd2

*=$120d

start:
        ldx #$00
    Loop:
            lda Hello,x
            beq Done
            jsr CHAROUT     // print using CHAROUT
            inx
            jmp Loop
Done:            
        rts

Hello:
    .byte $93               // Clear screen
    .text "hello world"     // Text to print
    .byte $0d, $00          // End of text

