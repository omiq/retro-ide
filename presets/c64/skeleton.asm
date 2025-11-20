BasicUpstart2(start)

        // ROM address to clear screen
        .const CLS_ADDR = $E544     

        // C64 screen ram
        .const SCREEN_ADDR = $0400                
        .const OUTPUT_ADDR = SCREEN_ADDR + $0A 

start:

        // clear screeen 
        jsr CLS_ADDR 

        // 'poke' to screen memory
        ldx #0                  // x reg as loop counter
Loop:
        lda text,x         // push char to accumulator
        beq Done           // if = 0 then end
        sta OUTPUT_ADDR,x  // push char to screen memory
        inx                // inc to next char + screen ram offset 
        jmp Loop           // loop
Done:

        rts                     // done/return

// null terminated string        
text: .text  @"hello kickassembler!\$00"

