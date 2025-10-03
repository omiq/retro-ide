// Test program with inline startup code
// This includes the startup code directly to avoid separate compilation

// Define the STARTUP segment inline
__asm__(".segment \"STARTUP\"");
__asm__("jmp _main");

int main() {
    // Simple program that just returns
    return 0;
}
