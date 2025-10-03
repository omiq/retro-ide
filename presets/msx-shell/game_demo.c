#include <stdio.h>
#include "msxbios.h"

int main() {
    CLS();
    POSIT(1, 1);  // Row 1, Column 1
    
    // Print title
    const char* msg = "MSX Game Demo";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    POSIT(3, 1);  // Row 3, Column 1
    msg = "Simple interactive demo:";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    POSIT(5, 1);  // Row 5, Column 1
    msg = "Use arrow keys to move the cursor";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    POSIT(7, 1);  // Row 7, Column 1
    msg = "Press ESC to exit";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    // Simple cursor movement demo
    int x = 10, y = 10;
    char key;
    
    do {
            POSIT(y, x);
        CHPUT('*');
        
        key = CHGET();
        
        // Clear current position
            POSIT(y, x);
        CHPUT(' ');
        
        // Move cursor based on key
        switch (key) {
            case 28: // Left arrow
                if (x > 1) x--;
                break;
            case 29: // Right arrow
                if (x < 40) x++;
                break;
            case 30: // Up arrow
                if (y > 1) y--;
                break;
            case 31: // Down arrow
                if (y < 24) y++;
                break;
        }
    } while (key != 27); // ESC key
    
    CLS();
    POSIT(1, 1);
    msg = "Game demo completed!";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    CHGET();
    return 0;
}
