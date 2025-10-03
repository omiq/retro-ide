#include <stdio.h>
#include <conio.h>

int main() {
    // Clear screen
    clrscr();
    
    // Print hello world message
    printf("Hello BBC Micro!\n");
    printf("Welcome to 8bitworkshop\n");
    printf("Press any key to continue...\n");
    
    // Wait for key press
    cgetc();
    
    // Clear screen again
    clrscr();
    
    // Print some BBC-specific info
    printf("BBC Micro with cc65\n");
    printf("6502 processor\n");
    printf("32KB RAM\n");
    
    // Infinite loop
    while (1) {
        // Wait for key press
        cgetc();
    }
    
    return 0;
} 