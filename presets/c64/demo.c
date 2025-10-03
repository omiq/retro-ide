
#include "big_text.h"
#include <6502.h>
#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <peekpoke.h>
#include <string.h>
#include <c64.h>
#include <cbm_screen_charmap.h>

#include "common.h"
//#link "common.c"

#include "rasterirq.h"
//#link "rasterirq.s"


//------sid music------------------------

//#resource "c64-sid.cfg"
#define CFGFILE c64-sid.cfg

//#resource "sidmusic1.bin"
//#link "sidplaysfx.s"
#include "sidplaysfx.h"

//---------------------------------------


#define SCREEN 0x400
#define BITMAP 0x5000
#define SCROLL_TOP 10

#define TOP_Y (SCROLL_TOP*8+50)
#define BOTTOM_Y (TOP_Y+3*8)

byte scroll_x = 0;
byte msg_x = 0;
int msg_index = 0;
unsigned char n, t;
int rx, x;
unsigned char msb;




/*{w:24,h:21,bpp:1,brev:1}*/
const char sprite[64] = {
	0x00, 0x00, 0x00,
	0x06, 0x00, 0x60,
	0x06, 0x00, 0x60,
	0x01, 0x81, 0x80,
	0x01, 0x81, 0x80,
	0x07, 0xFF, 0xE0,
	0x07, 0xFF, 0xE0,
	0x1E, 0x7E, 0x78,
	0x1E, 0x7E, 0x78,
	0x7F, 0xFF, 0xFE,
	0x7F, 0xFF, 0xFE,
	0x67, 0xFF, 0xE6,
	0x67, 0xFF, 0xE6,
	0x66, 0x00, 0x66,
	0x66, 0x00, 0x66,
	0x01, 0xE7, 0x80,
	0x01, 0xE7, 0x80,
	0x00, 0x00, 0x00,
	0x00, 0x00, 0x00,
	0x00, 0x00, 0x00,
	0x00, 0x00, 0x00,
};

  
  
// Pre-calculated sinus values
const char yValues[64] = {
  32, 35, 38, 41, 44, 47, 49, 52, 
  54, 56, 58, 60, 61, 62, 63, 63, 
  64, 63, 63, 62, 61, 60, 58, 56, 
  54, 52, 49, 47, 44, 41, 38, 35, 
  32, 28, 25, 22, 19, 16, 14, 11, 
  9, 7, 5, 3, 2, 1, 0, 0, 
  0, 0, 0, 1, 2, 3, 5, 7, 
  9, 11, 14, 16, 19, 22, 25, 28
};

#define VIC_CTRL1 (*(volatile unsigned char*)0xD018)

void setup_bitmap_and_charset(void) {
    byte charmem = (BITMAP >> 10) & 0x0F;    // high nibble
    byte screen  = (SCREEN >> 6) & 0x0F;     // low nibble
    VIC_CTRL1 = (charmem << 4) | screen | 0x20;
}  
  
// Raster wait with line argument
void rasterWait(unsigned char line) {
  while (VIC.rasterline < line) ;
}

const char LUT[8] = { 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80 };

char flip(char c_flip) {


	if(c_flip==107) return 105;
  	else if(c_flip==106) return 117;
	else if(c_flip==107) return 105;
	else if(c_flip==109) return 112;
    	else if(c_flip==125) return 110;
      	else if(c_flip==173) return 176;
      	else if(c_flip==177) return 178;
      	else if(c_flip==189) return 174;
  	else if(c_flip==203) return 201;
	else if(c_flip==202) return 213;


  	//return c_flip;
}

void scroll_one_column_left() {
  // copy several rows of screen memory
  // backwards one byte
  const word start = SCRNADR(SCREEN, 0, SCROLL_TOP);
  const word nbytes = 4*40-1;
  memcpy((byte*)start, (byte*)start+1, nbytes);

  cputcxy(39,10,MSG[msg_index]);
  cputcxy(39,11,MSG[msg_index+40]);
  cputcxy(39,12,MSG[msg_index+80]);
  cputcxy(39,13,flip(MSG[msg_index+80]));
  
  
  if (msg_index==39)
  {
    msg_index=40*4;
  }
  
  else if (msg_index==39+(40*4))
  {
    msg_index=40*8;
  }

  else if (msg_index==39+(40*8))
  {
    msg_index=0;
  }
  
  else {
    msg_index++;
  }
  
}

void scroll_one_pixel_left() {
  // scroll left one pixel
  scroll_x--;
  // set scroll register with lower three bits
  VIC.ctrl2 = (VIC.ctrl2 & ~7) | (scroll_x & 7);
  // move screen memory if the scroll register
  // has just gone past 0 and wrapped to 7
  if ((scroll_x & 7) == 7) {
    scroll_one_column_left();
  }
  // double-speed! (can comment this out)
  scroll_x--;
}

void display_list() {

  VIC.bgcolor[0] = COLOR_LIGHTBLUE;
  VIC.bordercolor = COLOR_LIGHTBLUE;

  DLIST_NEXT(124);  
  VIC.bgcolor[0] = TGI_COLOR_GRAY3;
  VIC.bordercolor = TGI_COLOR_GRAY3;
  
  DLIST_NEXT(128);  
  VIC.bgcolor[0] = COLOR_BLACK;
  VIC.bordercolor = COLOR_BLACK;
  
  DLIST_NEXT(165);  
  VIC.bgcolor[0] = COLOR_BLUE;
  VIC.bordercolor = COLOR_BLUE;

  DLIST_NEXT(170);  
  VIC.bgcolor[0] = COLOR_LIGHTBLUE;
  VIC.bordercolor = COLOR_LIGHTBLUE;

  DLIST_RESTART(0);
}

void set_row_color(byte line, byte color) {
  memset((byte*)COLOR_RAM+line*40, color, 40);
}
  
  
void move_sprites(void) {
        
      // MSB of each sprite's X coordinate (i.e. if X >= 256)
      msb = 0; 
           
      // Wait until raster hits position 250 before drawing upper sprites
      rasterWait(250);
      rx = x;
      
      // iterate over all 8 sprites
      for (t = 0 ; t < 8 ; t++) {

        rx -= 24;
        if (rx >= 0 && rx < 366) {
          
          // Set MSB of x coordinate for sprite if x position > 255
          if (rx >= 256) {
            msb |= LUT[t]; // look up 1 << t
          }
          VIC.spr_pos[t].x = rx;
          
          // Y position is an indirect Sinus function of X, using array
          // index for retrieving the Y value
          	VIC.spr_pos[t].y = yValues[rx & 63] + 40;
       	  } else {
          	VIC.spr_pos[t].x = 0;
          }
      }  
  
}
  
  
void duplicate_sprites(void) {
  
       // Set MSB of x coordinate
      VIC.spr_hi_x = msb; 

      // Wait until raster hits position 135 before drawing lower sprites
      rasterWait(135);
 
      // Add 128 to current sprite Y positions
      for (t = 0 ; t < 8 ; t++) {
        VIC.spr_pos[t].y += 128;
      }
}

void main(void) {

  
  char next_column=0;
  char chars=21;
  char y,c,the_next_char=0;
  int i;
  clrscr();
  bordercolor(COLOR_BLACK);	// set color to blue
  bgcolor(COLOR_BLACK);		// set background color
  textcolor(COLOR_BLACK);	// set text color
  
  for(i=0; i<1000; i++) {
  	COLOR_RAM[i]=0;
  }
  
  // initialize SID player
  sid_init(0);
  sid_start();
  memset((byte*)SCREEN, 32, 0x400);
  
  // set character set to uppercase + graphics characters
  SET_VIC_BITMAP(0x1000);
	
  i=0;
  next_column=0;
  msg_char=0;
    
  for(c=0; c < chars; c++)
  {
    the_next_char=next_char();
    draw_big(the_next_char,next_column,y);
    next_column=next_column+character_width(the_next_char);
  }
  
  //........................................
  strncpy(msg, "MUCH LOVE FOR THE C64!!! \0", 22);
  next_column=0;
  msg_char=0;
  y=4;  
  for(c=0; c < chars; c++)
  {
    the_next_char=next_char();
    draw_big(the_next_char,next_column,y);
    next_column=next_column+character_width(the_next_char);
  }
  
  //........................................
  strncpy(msg, "MADE THANKS TO CC65       \0", 22);
  next_column=0;
  msg_char=0;
  y=8;  
  for(c=0; c < chars; c++)
  {
    the_next_char=next_char();
    draw_big(the_next_char,next_column,y);
    next_column=next_column+character_width(the_next_char);
  }
  

  
  for(x=0; x<1000; x++)
  {
   c=PEEK(0x400+x);
   if(c<32) c+=64;
   else if(c >= 64 && c<=93) c+=128;
   else if(c==95) c+=64;
   else if(c >= 96 && c<=127) c+=64; 
   MSG[x]=c;
  }
  
  //cgetc();
  clrscr();
  
// ******* sprite init ***************************
 
  // Set 13th sprite bitmap
  for (n = 0 ; n < sizeof(sprite) ; n++) {
    POKE(832 + n, sprite[n]);
  }
  // enable all sprites
  VIC.spr_ena = 255;

  // Set all sprite pointers to 13th sprite
  for (t = 0 ; t < 8 ; t++) {
    POKE(2040 + t, 13); 
  }
   
  
  // set color RAM for each row of chars
  set_row_color(SCROLL_TOP+0, COLOR_WHITE);
  set_row_color(SCROLL_TOP+1, COLOR_YELLOW);
  set_row_color(SCROLL_TOP+2, COLOR_LIGHTRED);
  set_row_color(SCROLL_TOP+3, COLOR_BLUE);
  
  // set new address for character bitmaps
  SET_VIC_BITMAP(BITMAP);
  
  // set 38 column mode (for X scrolling)
  VIC.ctrl2 = 0b00000000;
    
  // setup IRQs to change colors
  DLIST_SETUP(display_list);
  
  // Start with invaders
  for (x = 750 ; x > 0; x--) { move_sprites(); }
  
  
  // infinite loop
  while (1) {
    
    for (x = 0 ; x < 550; x++) { 
    
      // Top sprites
      move_sprites();	  
    
      // Scroll the message
      scroll_one_pixel_left();
      
      // Play next music part
      sid_update();

      // Bottom sprites
      duplicate_sprites();
 
    }
  }
}
