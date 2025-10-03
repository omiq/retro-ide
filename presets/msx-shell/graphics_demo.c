#include <stdio.h>
#include "msxbios.h"

void print_string(char *msg);

int main() {
    int row, col;
    
    CLS();
    POSIT(1, 1);  // Row 1, Column 1
    
    // Print title
    print_string("MSX Graphics Demo");
    
    // Draw some simple graphics using characters
    POSIT(3, 1);  // Row 3, Column 1
    print_string("Drawing a box:");
    
    // Draw a simple box
    for (row = 5; row <= 10; row++) {
        POSIT(row, 5);  // Row, Column
        for (col = 5; col <= 20; col++) {
            if (row == 5 || row == 10 || col == 5 || col == 20) {
                CHPUT('*');
            } else {
                CHPUT(' ');
            }
        }
    }
    
    POSIT(18, 1);  // Row 18, Column 1
    print_string("Press any key to exit...");
    
    CHGET();
    return 0;
}

void print_string(char *msg) {
    while (*msg) {
        CHPUT(*msg++);
    }
}
