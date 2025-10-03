10 REM BBC BASIC: Labels via ON...GOTO and structured loops
20 MODE 7:CLS
30 PRINT "BBC BASIC Labels Example"
40 PRINT STRING$(32,"-")
50 PRINT "Press 1,2,3 to jump to sections, or Q to quit"
60 PRINT
70 REPEAT
80   PRINT "Choice (1-3, Q)? ";
90   C$=GET$
100  PRINT C$
110  IF C$="Q" OR C$="q" THEN END
120  K=VAL(C$)
130  IF K<1 OR K>3 THEN PRINT "Invalid. Try again." : GOTO 70
140  ON K GOTO 300,400,500
150 REM Fallthrough
160 GOTO 70
170 REM --- Section 1
300 PRINT
310 PRINT "[Section 1] Using a FOR loop"
320 FOR I=1 TO 5: PRINT "I=";I: NEXT
330 GOTO 800
340 REM --- Section 2
400 PRINT
410 PRINT "[Section 2] REPEAT...UNTIL"
420 C=0
430 REPEAT: C=C+1: PRINT "."; : UNTIL C=10
440 PRINT:PRINT "Done"
450 GOTO 800
460 REM --- Section 3
500 PRINT
510 PRINT "[Section 3] Subroutine call"
520 PROChello("world")
530 GOTO 800
540 REM --- Return point
800 PRINT
810 PRINT "Back at menu"
820 REM Return to menu loop
830 GOTO 70
840 REM --- Subroutines
850 DEF PROChello(N$)
860 PRINT "Hello, ";N$;"!"
870 ENDPROC

