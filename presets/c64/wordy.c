#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <conio.h>
#include <cbm.h>
#include "common.h"
#include <cbm_petscii_charmap.h>

char target[6], guess[6];

void selectWord(char *target, const char *words[], int wordCount, int seed) {
  _randomize();
    srand(seed);
    strcpy(target, words[rand() % wordCount]);
}

void prompt()
{
    printf("? ");
    fgets(guess, sizeof(guess), stdin);

}

void playWordle(int seed) {
    const char *words[] = {
        "apple", "beach", "blink", "candy", "chair", "cloud", "dance", "eagle",
        "flame", "fruit", "ghost", "grape", "heart", "honey", "image", "jewel",
        "knife", "lemon", "magic", "music", "ocean", "paint", "peach", "queen",
        "river", "salad", "shade", "spark", "stone", "sugar", "table", "tiger",
        "tower", "train", "tulip", "video", "water", "wheat", "zebra", "arrow",
        "bread", "comet", "dream", "frost", "grass", "house", "light", "petal",
        "smile", "storm"
    };
    int wordCount = 50;
    int i;
    int attempts = 6;


    selectWord(target, words, wordCount, seed);

    while (attempts > 0) {
	textcolor(COLOR_WHITE);
        printf("Enter a 5-letter guess (%d left)", attempts);
       
        prompt();
     
        if (strlen(guess) >6) {
            printf("\n\rMust be 5 letters!\n");
            continue;
        }
        attempts--;
	printf("\n\r");
        for (i = 0; i < 5; i++) {
            if (guess[i] == target[i]) {
                textcolor(COLOR_GREEN);
                cputc(guess[i]);
            } else if (strchr(target, guess[i]) != NULL) {
              	textcolor(COLOR_YELLOW);
                cputc(guess[i]);
            } else {
              	textcolor(COLOR_LIGHTBLUE);
                cputc('_');
            }
        }
        printf("\n");
	textcolor(COLOR_WHITE);
        if (strcmp(guess, target) == 0) {
            printf("\n\n\n\rYou win!\n");
            break;
        }
    }
    textcolor(COLOR_WHITE);
    printf("\n\r\n\n\rThe word was: %s\n", target);
    printf("\n\n\n\r would you like to play again?");
    while(!kbhit()) {
      
    }
    cgetc();
    return;
}

int main() {
    int counter;
    while(1) {
      clrscr();
      bordercolor(COLOR_BLUE);
      textcolor(COLOR_WHITE);
      printf("             WORDY GAME\n");
      printf("             __________");
      textcolor(COLOR_LIGHTBLUE);
      printf("\n\r\n\r  (that in no way infringes on any ip)");
      textcolor(COLOR_WHITE);
      printf("\r\n\r\n         press a key to play");
      printf("\n\r\n\r");
      printf("\n\r\n\r            INSTRUCTIONS\n");
      printf("\n\ryou have six attempts to guess the word");
      textcolor(COLOR_YELLOW);
      printf("\n\r\nguess is correct but not in that spot");

      textcolor(COLOR_GREEN);
      printf("\n\r\nyour guess is good + correct position");
      
      textcolor(COLOR_LIGHTBLUE);
      printf("\n\r\n\r");
      printf("\n\r\n\r");
      printf("\n\r\n\r(c) Chris Garrett @retrogamecoders 2025");
      
      while(!kbhit()) {
          counter++;
      }
      cgetc();
      clrscr();
      playWordle(counter);
    }
    return 0;
}