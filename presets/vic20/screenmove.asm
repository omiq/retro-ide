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
            beq MAIN
            jsr CHAROUT     // print using CHAROUT
            inx
            jmp Loop

      jmp MAIN
DFLT: nop          // VAR: Default vertical picture origin minus one
MAIN: ldx $9001
      dex          // Decrement picture origin to make loop simpler
      stx DFLT     // Store default vertical picture origin minus one
      lda #$BE     // Begin with picture origin off screen
LOOP: sta $9001    // Change vertical picture origin
      ldx #$09
WAIT: ldy #$FF
WAI2: dey
      bne WAI2
      dex
      bne WAIT
      sbc #$01     // Move picture origin up one
      cmp DFLT     // Is vertical picture origin back at default?
      bne LOOP
      jmp start



Done:            
        rts

Hello:
    .byte $93               // Clear screen
    .text "hello world"     // Text to print
    .byte $0d, $00          // End of text

