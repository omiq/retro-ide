#include <stdio.h>
#include <conio.h>

int main() {
    // Clear screen
    clrscr();
    
    // Print test message
    printf("BBC Micro Test Program\n");
    printf("======================\n");
    printf("If you can see this, the BBC platform is working!\n");
    printf("\n");
    printf("Press any key to continue...\n");
    
    // Wait for key press
    cgetc();
    
    // Clear screen again
    clrscr();
    
    // Print success message
    printf("SUCCESS!\n");
    printf("BBC Micro platform is working correctly.\n");
    printf("cc65 compilation successful.\n");
    
    // Infinite loop
    while (1) {
        cgetc();
    }
    
    return 0;
}
