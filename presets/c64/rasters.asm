// Fast loop through screen/border colors

// BASIC autostart 
// (alternatively use BasicUpstart2() - see hello world example):
// 10 SYS (4096)
*=$0800 "BASIC Start"
        .byte $00                // byte 1 always zero
        .byte $0E, $08           // next basic line
        .byte $0A, $00           // line 10/$0A
        
        // 'SYS(4096)'
        .byte $9E, $20, $28,  $34, $30, $39, $36, $29 
        .byte $00, $00, $00      
        // end of basic code


counter: .byte 0 // loop counter


*=$1000 "Main Subroutine"
Main:
        // assembler constants for special addresses
        .const BORDER_COLOR_ADDR 	= $D020         
        .const BACKGROUND_COLOR_ADDR 	= $D021    
        .const CLS_ADDR = $E544  
        .const INNER_MAX = $FF        
        .const OUTER_MAX = $B0       
       
        jsr CLS_ADDR

Loop:


        inc BORDER_COLOR_ADDR      // inc border colour 
        inc BACKGROUND_COLOR_ADDR  // inc background colour 

        // counter < max then loop
        inc counter          
        lda #INNER_MAX
        cmp counter
        bne Loop 

        // reset counter
        lda #00
        sta counter
       

        // loop
        jmp Loop
Done:
        rts


