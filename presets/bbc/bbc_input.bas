10 REM BBC BASIC: Keypress input and simple movement
20 MODE 7:CLS:VDU 23,1,0;0;0;0;: REM Cursor off
30 PRINT "Use WASD to move the @, Q to quit"
40 X=10:Y=10
50 PROCdraw(X,Y)
60 REPEAT
70   K$=GET$
80   IF K$="q" OR K$="Q" THEN END
90   IF K$="w" OR K$="W" THEN Y=Y-1
100  IF K$="s" OR K$="S" THEN Y=Y+1
110  IF K$="a" OR K$="A" THEN X=X-1
120  IF K$="d" OR K$="D" THEN X=X+1
130  CLS: PROCdraw(X,Y)
140 UNTIL FALSE
150 END
160 DEF PROCdraw(X,Y)
170 PRINT TAB(X,Y);"@"
180 ENDPROC