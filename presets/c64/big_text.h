
#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <peekpoke.h>
#include <string.h>
#include <c64.h>
#include <cbm_petscii_charmap.h>
#include <conio.h>
#include <ctype.h>
#include "common.h"
//#link "common.c"


unsigned char font[40*3*2] = {
  85, 73,112, 73, 85, 73,112, 73,112, 73,112, 73, 85, 73,110,110,114,112,110,110, 85,110, 32,112,114, 73,114, 73, 85, 73,114, 73, 85, 73,114, 73, 85, 73,112,114,
107,115,107,115, 66, 32, 93, 66,107, 32,107, 32, 66,110,107,115, 93, 32, 66,107, 73, 93, 32, 93, 66, 93, 93, 93, 66, 66,107, 75, 66, 66,107, 75, 74, 73, 32, 66,
 75, 74,109, 75, 74, 75,109, 75,109, 75, 75, 32, 74, 75,125,125,113, 74, 75,125, 74,109,125,125, 32,109,125, 74, 74, 75,113, 32, 74,113,113, 74, 74, 75, 32,113,
110,112,110,112,110, 32, 85, 73, 85,110, 85,112,110,112,110, 32,110,112,110,112,110,110,112,112,110,112,110,112,110,112,110,112,110, 32, 32, 32,108, 32, 32, 32,
 66, 93, 66, 93, 66, 66, 66,107,115, 74,115, 85, 75, 66, 66, 32, 66,112,125, 32,115,109,115,109,110,107,110, 32,115,107,115,109,115, 32, 32, 32,124, 32, 32, 32,
 74, 75,109, 75,109,113, 75, 75, 74, 32, 75,109,125,109,125, 32,113,109,125,109,125, 32,109,109,125,109,125, 32,109,109,125,109,125,110,124, 32,124, 32, 32, 32,
 
};

unsigned char msg_char=0;
unsigned char* msg="HELLO FROM JULY 2025!  \0";//
unsigned char MSG[1000];

char next_char(void) {
  
  char return_char = (msg[msg_char]);
  if(return_char == 0) return_char = 32;
  msg_char++;
  if(msg_char == 22) msg_char=0;
  return return_char;
  
}

char big_char[9];
void set_big_char(char in_char)
{
  int char_offset = 0;
  char font_loc = 0;
  char_offset = (in_char-65)+(in_char-65);
  if(in_char>='i' && in_char < 'n') char_offset-=1;
  if(in_char=='u' || in_char=='v') char_offset+=80;
  if(in_char=='w') char_offset+=80;
  if(in_char=='x' || in_char=='y' || in_char=='z') char_offset+=81;
  if(in_char>='0' && in_char <= '9') char_offset+=167;

  if(in_char==' ') 
  {
    big_char[0]=32;
    big_char[1]=32;
    big_char[2]=32;
    return;
  }  
  
  if(in_char==',') 
  {
    big_char[0]=32;
    big_char[1]=32;
    big_char[2]=110;
    return;
  }  

  if(in_char=='.') 
  {
    big_char[0]=32;
    big_char[1]=32;
    big_char[2]=108;
    return;
  }  

  if(in_char=='!') 
  {
    big_char[0]=108;
    big_char[1]=124;
    big_char[2]=124;
    return;
  }  

  
  font_loc = char_offset;
  
  //printf("\n\n\n\n\n\n\n%d\n%d", in_char, font_loc);

  if(in_char=='m' || in_char=='w'){
    
    big_char[0]=font[font_loc+0];
    big_char[1]=font[font_loc+1];
    big_char[2]=font[font_loc+2];
    big_char[3]=font[font_loc+41];
    big_char[4]=font[font_loc+42];
    big_char[5]=font[font_loc+43];
    big_char[6]=font[font_loc+80];
    big_char[7]=font[font_loc+81];
    big_char[8]=font[font_loc+82];
   
  }
  
   
  else if(in_char=='i'){
    
    big_char[0]=font[font_loc+0];
    big_char[1]=font[font_loc+40];
    big_char[2]=font[font_loc+80];
   
  } else {
    big_char[0]=font[font_loc+0];
    big_char[1]=font[font_loc+1];
    big_char[2]=font[font_loc+40];
    big_char[3]=font[font_loc+41];
    big_char[4]=font[font_loc+80];
    big_char[5]=font[font_loc+81];

  }
  
}

void draw_big(char next_char_to_draw, char x, char y)
{
  unsigned int i=0;
  set_big_char(next_char_to_draw);
  
  i = (y*40)+x;
  
  if(next_char_to_draw == 'm' || next_char_to_draw == 'w') {
    //printf("\n\n%c",next_char_to_draw);

    POKE(0x400+i+1,big_char[0]);
    POKE(0x400+i+2,big_char[1]);
    POKE(0x400+i+3,big_char[2]);
    POKE(0x400+i+41,big_char[3]);
    POKE(0x400+i+42,big_char[4]);
    POKE(0x400+i+43,big_char[5]);  
    POKE(0x400+i+81,big_char[6]);
    POKE(0x400+i+82,big_char[7]);
    POKE(0x400+i+83,big_char[8]);  
  } 
  
  else if (next_char_to_draw==' ' || next_char_to_draw=='i' || next_char_to_draw ==',' || next_char_to_draw =='.'|| next_char_to_draw =='!' ){
    //printf("\n\n%c",next_char_to_draw);

    POKE(0x400+i+1,big_char[0]);
    POKE(0x400+i+41,big_char[1]);
    POKE(0x400+i+81,big_char[2]);

  } else {
    POKE(0x400+i+1,big_char[0]);
    POKE(0x400+i+2,big_char[1]);
    POKE(0x400+i+41,big_char[2]);
    POKE(0x400+i+42,big_char[3]);
    POKE(0x400+i+81,big_char[4]);
    POKE(0x400+i+82,big_char[5]);
  }  
}


char character_width(char char_to_measure) {
  
 if(char_to_measure=='I' || char_to_measure=='!' || char_to_measure==',' || char_to_measure=='.' || char_to_measure==' ') return 1;    
 if(char_to_measure=='w' || char_to_measure=='m') return 3;   
 return 2; 
}



