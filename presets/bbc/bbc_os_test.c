// BBC Micro test program using direct OS calls
// This bypasses the puts() function and uses BBC OS directly

int main(void) {
    // BBC OS call to write character (OSWRCH)
    // Write "Hello BBC!" using direct OS calls
    
    __asm__("LDA #'H'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'e'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'l'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'l'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'o'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #' '"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'B'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'B'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'C'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #'!'"); __asm__("JSR $FFEE");  // OSWRCH
    __asm__("LDA #13"); __asm__("JSR $FFEE");   // OSWRCH (carriage return)
    __asm__("LDA #10"); __asm__("JSR $FFEE");   // OSWRCH (line feed)
    
    // Wait for key press
    __asm__("JSR $FFE0");  // OSRDCH - Read character from input stream
    
    return 0;
}
