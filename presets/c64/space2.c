#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <peekpoke.h>
#include <string.h>
#include <c64.h>
#include <cbm_petscii_charmap.h>

#include "common.h"
//#link "common.c"

unsigned char map[20][20];
unsigned int r;
unsigned char c;
unsigned char x,y;

struct Player {
 int x;
 int y;
 unsigned char current_system; 
 bool alive;
 unsigned char power;
 unsigned char shields;
 unsigned char damage;
};

struct System {
  int planets;
  int bases; 
  int stars; 
  int klingons;
  
};

struct Player player;

struct System galaxy[9*9];

void draw_system(int planets, int bases, int stars, int klingons) {

  int p;
  int b;
  int s;
  int k;
  clrscr();
  
  // Space debris and asteroids and such
  for(y=0; y<20; y++) {
    
    for(x=0; x<20; x++) {
      
      if((rand() % 20)==1) {
        map[y][x]='.';
      } else { 
        map[y][x]=32;
      }

    }
       
  };
  
  // planets and such
  for(p=0; p<planets; p++) {
    map[rand()%20][rand()%20]=81;
  }
  
  // base
  for(b=0; b<bases; b++) {  
      map[rand()%20][rand()%20]=88;
  }
    
  // stars
  for(s=0; s<stars; s++) {  
      map[rand()%20][rand()%20]=42;
  }  
 
  // klingons
  for(k=0; k<klingons; k++) {  
      map[rand()%20][rand()%20]=86;
  }  
  
  
  // Place the player
  map[player.x][player.y] = 65;
  
  // draw grid
  gotoxy(0,0);
  puts("%%%%%%%%%%%%%%%%%%%%%%");
  
  for(y=0; y<20; y++) {
    
    POKE(1024+((y+1)*40),'%');
    
    for(x=0; x<20; x++) {
      
    	POKE(1024+((y+1)*40+(x+1)),(map[y][x]));
    }
    
    POKE(1024+((y+1)*40+21),'%');

  };

  gotoxy(0,21);
  puts("%%%%%%%%%%%%%%%%%%%%%%");
  

}


void hud(void) {
  
  
  unsigned char lrsA, lrsB, lrsC, lrsD, lrsE, lrsF, lrsG, lrsH, lrsI;
  
  lrsA = player.current_system-10;
  lrsB = player.current_system-9;
  lrsC = player.current_system-8;

  lrsD = player.current_system-1;
  lrsE = player.current_system;
  lrsF = player.current_system+1;
  
  lrsG = player.current_system+8;
  lrsH = player.current_system+9;
  lrsI = player.current_system+10;
  

  
  gotoxy(23, 1);
  printf("%cspace battle game%c",18,146);

  gotoxy(23, 3);
  printf("power: %d",player.power);
  
  gotoxy(23, 4);  
  printf("shields: %d",player.shields);

  gotoxy(23, 5);
  printf("damage: %d",player.damage);

  gotoxy(23, 7);
  printf("location: %d",player.current_system);

  // LRS
  gotoxy(23, 10);
  printf("long range scan:");

  gotoxy(23, 11);
  printf("%d:%d:%d",galaxy[lrsA].klingons,galaxy[lrsA].bases,galaxy[lrsA].stars);
  printf(" %d:%d:%d",galaxy[lrsB].klingons,galaxy[lrsB].bases,galaxy[lrsB].stars);
  printf(" %d:%d:%d",galaxy[lrsC].klingons,galaxy[lrsC].bases,galaxy[lrsC].stars);
  gotoxy(23, 12);
  printf("%d:%d:%d",galaxy[lrsD].klingons,galaxy[lrsD].bases,galaxy[lrsD].stars);
  printf(" %d:%d:%d",galaxy[lrsE].klingons,galaxy[lrsE].bases,galaxy[lrsE].stars);
  printf(" %d:%d:%d",galaxy[lrsF].klingons,galaxy[lrsF].bases,galaxy[lrsF].stars);
  gotoxy(23, 13);
  printf("%d:%d:%d",galaxy[lrsG].klingons,galaxy[lrsG].bases,galaxy[lrsG].stars);
  printf(" %d:%d:%d",galaxy[lrsH].klingons,galaxy[lrsH].bases,galaxy[lrsH].stars);
  printf(" %d:%d:%d",galaxy[lrsI].klingons,galaxy[lrsI].bases,galaxy[lrsI].stars);
  

  
}


void srs() {
  
  int planets = galaxy[player.current_system].planets;
  int bases = galaxy[player.current_system].bases; 
  int stars = galaxy[player.current_system].stars; 
  int klingons = galaxy[player.current_system].klingons;
  
  draw_system(planets,bases,stars,klingons);
  
}

void init(void) {
  
  // Fill the galaxy
  unsigned char total_systems = sizeof(galaxy);
  
  // Iterate and randomize
  unsigned char this_system;
  for(this_system = 0; this_system < total_systems; this_system++) {
   	galaxy[this_system].planets = rand() % 9;
   	galaxy[this_system].bases = rand() % 2;
   	galaxy[this_system].stars = rand() % 2;
   	galaxy[this_system].klingons = rand() % 3;
    	//printf("generated system %d\n",this_system);
    
  }
  
  player.x = 10;
  player.y = 10;
  player.alive = true;
  player.power = 100;
  player.shields = 0;
  player.damage = 0;
  player.current_system = 36;

  
}

void main(void) {

  // set character set to uppercase + graphics characters
  SET_VIC_BITMAP(0x1000);

  bordercolor(COLOR_BLUE);
  textcolor(COLOR_WHITE);


  clrscr();  
  while(1) {


    _randomize();
    r = rand()%3;

    init();
    srs();
    hud();

    cgetc();
    
  }
}

