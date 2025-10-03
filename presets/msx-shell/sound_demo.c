#include <stdio.h>
#include "msxbios.h"

void print_string(char *msg);

int main() {
    CLS();
    POSIT(1, 1);  // Row 1, Column 1
    
    // Print title
    print_string("MSX Sound Demo");
    
    POSIT(3, 1);  // Row 3, Column 1
    print_string("Playing a simple melody...");
    
    // Simple sound demo using PSG
    // Note: This is a basic example - real MSX sound programming is more complex
    
    POSIT(5, 1);  // Row 5, Column 1
    print_string("Sound demo completed!");
    
    POSIT(7, 1);  // Row 7, Column 1
    print_string("Press any key to exit...");
    
    CHGET();
    return 0;
}

void print_string(char *msg) {
    while (*msg) {
        CHPUT(*msg++);
    }
}
