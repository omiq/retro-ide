
#include <stdio.h>
#include <conio.h>
#include <c64.h>
#include <cbm_petscii_charmap.h>

void main(void) {
  clrscr();			// clear screen
  puts(" Welcome Adventurer!\n");// write message at cursor
  chline(22);			// horizontal line
  bordercolor(COLOR_LIGHTBLUE);	// set color to blue
  bgcolor(COLOR_BLUE);		// set background color
  textcolor(COLOR_YELLOW);	// set text color
  
  // write message
  puts("\n\n This IDE and emulation tool\n"); 
  puts(" Is forked from Steven E. Hugg\n"); 
  puts(" Under the GPL-3.0 license\n");

  
  textcolor(COLOR_WHITE);	// set text color
  puts("\n\n - Chris Garrett\n   @RetroGameCoders");
  
  textcolor(COLOR_LIGHTBLUE);	// set text color  
  puts("\n\n Press a Key to Continue\n"); 
  
  // wait for input
  cgetc();
  // clear the screen
  clrscr();
}
  