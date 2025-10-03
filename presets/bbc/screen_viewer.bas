10 REM SCREEN viewer demo (assumes file SCREEN saved with load=&3000)
20 MODE 5:CLS
30 REM Load raw screen bytes into &3000
40 *LOAD SCREEN 3000
50 REM Display routine for a packed screen may vary; here we just show a banner
60 PRINT"SCREEN file loaded to &3000"
70 PRINT"(Use your own routine to render memory to display)"
80 PRINT"Press any key...";:A$=GET$
