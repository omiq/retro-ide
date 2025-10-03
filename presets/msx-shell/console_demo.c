#include <stdio.h>
#include "msxbios.h"

void print_string(char *msg);

int main() {
    char key;
    
    CLS();
    POSIT(1, 1);  // Row 1, Column 1
    
    // Print welcome message
    print_string("MSX Console I/O Demo");
    
    POSIT(3, 1);  // Row 3, Column 1
    print_string("Press any key to continue...");
    
    // Wait for key press
    key = CHGET();
    
    POSIT(5, 1);  // Row 5, Column 1
    print_string("You pressed: ");
    CHPUT(key);
    
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
