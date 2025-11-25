// Hello World program for unexpanded Vic 20 (manual BASIC)
// This shows how to manually create the BASIC start program 
.encoding "petscii_mixed"

        *= $1001 "BASIC Start"

        // BASIC line structure:
        // [next_line_low, next_line_high, line_num_low, line_num_high, code..., $00]
        
        .byte $0d, $10           // Next line pointer: $100d (where machine code starts)
        .byte $0a, $00           // Line number: 10 ($000a)
        
        // 'SYS(4109)' - SYS token ($9E) followed by "(4119)" in PETSCII
        // 4119 = $1017 (where our machine code starts)
        .byte $9e                // SYS token
        .byte $20                // Space
        .byte $28                // '('
        .byte $34, $31, $31, $39 // "4119" in PETSCII
        .byte $29                // ')'
        .byte $00                // End of line
        .byte $00, $00           // End of BASIC program (next line = $0000)


.const CHAROUT = $ffd2
*=$1017  "code" // Machine code starts here (after the BASIC line)

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

